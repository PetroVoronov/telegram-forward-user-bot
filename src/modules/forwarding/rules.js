/**
 * Get the forum topic id of a message.
 * A message posted directly in a topic refers to the topic via `replyToMsgId`, a reply inside a topic keeps the topic in
 * `replyToTopId` (and `replyToMsgId` points to the replied message). Messages of the "General" topic have no topic reference.
 * @param {object} message - The message object
 * @returns {number} The topic id, 1 for the "General" topic
 **/
function getMessageTopicId(message) {
  const replyTo = message?.replyTo;
  if (replyTo?.forumTopic === true) {
    return replyTo.replyToTopId ?? replyTo.replyToMsgId ?? 1;
  }
  return 1;
}

/**
 * Get all enabled forwarding rules for the source chat
 * @param {object[]} forwardRules - The list of forwarding rules
 * @param {number|string} sourceId - The id of the source chat
 * @returns {object[]} The enabled rules with the source chat
 **/
function getEnabledRulesForSource(forwardRules, sourceId) {
  return Array.isArray(forwardRules)
    ? forwardRules.filter((rule) => rule?.enabled === true && rule.from?.id === `${sourceId}`)
    : [];
}

/**
 * Check if the message belongs to the source topic of the rule. Rules without source topic accept any message.
 * @param {object} rule - The forwarding rule
 * @param {object} entityFrom - The entity of the source chat
 * @param {object} message - The message object
 * @returns {boolean} True if the message has to be processed by the rule
 **/
function isMessageInRuleTopic(rule, entityFrom, message) {
  if (rule.from.type !== 'topic') {
    return true;
  }
  return entityFrom?.forum === true && getMessageTopicId(message) === rule.from.topicId;
}

/**
 * Get the key of the rule to keep the forwarding state per rule: several rules can have the same source.
 * The key is based on the source and destination, so it is changed if the rule is pointed to another chat or topic.
 * @param {object} rule - The forwarding rule
 * @returns {string} The rule key
 **/
function getRuleKey(rule) {
  return `${rule.from?.id}:${rule.from?.topicId ?? ''}>${rule.to?.id}:${rule.to?.topicId ?? ''}`;
}

/**
 * Normalize the stored message state. Earlier versions stored only the message id as a number.
 * @param {object|number|undefined} state - The stored state
 * @returns {{id: number, ids?: number[], editDate: number, message: string}|null} The message state or null
 **/
function getMessageState(state) {
  if (typeof state === 'number' && state > 0) {
    return {id: state, editDate: 0, message: ''};
  }
  if (typeof state === 'object' && state !== null && typeof state.id === 'number') {
    return {...state, editDate: state.editDate || 0, message: state.message || ''};
  }
  return null;
}

/**
 * Check the message text by the keywords groups of the rule.
 * The message matches the group, if the included keywords of the group are present (all or some of them, see includeAll)
 * and no excluded keyword is present. The message matches the rule, if it matches any group.
 * The rule without keywords groups doesn't match any message (as in the earlier versions), the group without keywords matches any.
 * The keywords are matched case sensitive (as in the earlier versions), unless it is switched off in the group (caseSensitive).
 * @param {object[]} keywordsGroups - The keywords groups of the rule
 * @param {string} message - The message text
 * @returns {{matched: boolean, groups: object[]}} The result and the details per group:
 *   {label, includeAll, caseSensitive, includesFound, excludesNotFound}
 **/
function matchKeywords(keywordsGroups, message) {
  if (Array.isArray(keywordsGroups) === false || keywordsGroups.length === 0) {
    return {matched: false, groups: []};
  }
  const groups = keywordsGroups.map((group) => {
    const caseSensitive = group?.caseSensitive !== false,
      normalize = (value) => (caseSensitive ? `${value ?? ''}` : `${value ?? ''}`.toLocaleLowerCase()),
      text = normalize(message),
      keywords = Array.isArray(group?.keywords) ? group.keywords : [],
      includes = keywords.filter((item) => item.include === true).map((item) => normalize(item.keyword)),
      excludes = keywords.filter((item) => item.include === false).map((item) => normalize(item.keyword)),
      includeAll = group?.includeAll === true,
      includesFound =
        includes.length === 0 || (includeAll ? includes.every((item) => text.includes(item)) : includes.some((item) => text.includes(item))),
      excludesNotFound = excludes.every((item) => text.includes(item) === false);
    return {label: group?.label, includeAll, caseSensitive, includesFound, excludesNotFound};
  });
  return {matched: groups.some((group) => group.includesFound && group.excludesNotFound), groups};
}

// Rule options added in the later versions, with the values which keep the earlier behavior of the existing rules
const keywordsGroupDefaults = {
  caseSensitive: true,
};

/**
 * Set the missing options of the rules (i.e. rules created by the earlier versions) to the defaults
 * @param {object[]} rules - The forwarding rules, changed in place
 * @returns {boolean} True if any rule is changed
 **/
function applyRuleDefaults(rules) {
  let changed = false;
  for (const rule of Array.isArray(rules) ? rules : []) {
    for (const group of Array.isArray(rule?.keywordsGroups) ? rule.keywordsGroups : []) {
      for (const [key, value] of Object.entries(keywordsGroupDefaults)) {
        if (typeof group === 'object' && group !== null && group[key] === undefined) {
          group[key] = value;
          changed = true;
        }
      }
    }
  }
  return changed;
}

module.exports = {
  getMessageTopicId,
  getEnabledRulesForSource,
  isMessageInRuleTopic,
  getRuleKey,
  getMessageState,
  matchKeywords,
  applyRuleDefaults,
};
