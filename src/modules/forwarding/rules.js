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

module.exports = {
  getMessageTopicId,
  getEnabledRulesForSource,
  isMessageInRuleTopic,
};
