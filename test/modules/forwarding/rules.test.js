const {getMessageTopicId, getEnabledRulesForSource, isMessageInRuleTopic} = require('../../../src/modules/forwarding/rules');

describe('getMessageTopicId', () => {
    test('should return 1 for a message in the "General" topic', () => {
        expect(getMessageTopicId({id: 10})).toBe(1);
    });

    test('should return 1 for a reply in the "General" topic', () => {
        expect(getMessageTopicId({id: 11, replyTo: {replyToMsgId: 10}})).toBe(1);
    });

    test('should return the topic id for a message posted directly in a topic', () => {
        expect(getMessageTopicId({id: 21, replyTo: {forumTopic: true, replyToMsgId: 20}})).toBe(20);
    });

    test('should return the topic id for a reply inside a topic', () => {
        expect(getMessageTopicId({id: 23, replyTo: {forumTopic: true, replyToMsgId: 22, replyToTopId: 20}})).toBe(20);
    });

    test('should return 1 for a missing message', () => {
        expect(getMessageTopicId(undefined)).toBe(1);
    });
});

describe('getEnabledRulesForSource', () => {
    const rules = [
        {label: 'disabled', enabled: false, from: {id: '100'}, to: {id: '200'}},
        {label: 'first', enabled: true, from: {id: '100'}, to: {id: '300'}},
        {label: 'other source', enabled: true, from: {id: '101'}, to: {id: '300'}},
        {label: 'second', enabled: true, from: {id: '100'}, to: {id: '400'}},
    ];

    test('should skip disabled rules', () => {
        expect(getEnabledRulesForSource(rules, 100).map((rule) => rule.label)).not.toContain('disabled');
    });

    test('should return all enabled rules of the source', () => {
        expect(getEnabledRulesForSource(rules, 100).map((rule) => rule.label)).toEqual(['first', 'second']);
    });

    test('should accept the source id as a string', () => {
        expect(getEnabledRulesForSource(rules, '101').map((rule) => rule.label)).toEqual(['other source']);
    });

    test('should return an empty list for missing rules', () => {
        expect(getEnabledRulesForSource(undefined, 100)).toEqual([]);
        expect(getEnabledRulesForSource(rules, 999)).toEqual([]);
    });
});

describe('isMessageInRuleTopic', () => {
    const forum = {forum: true},
        topicRule = {from: {id: '100', type: 'topic', topicId: 20}},
        generalRule = {from: {id: '100', type: 'topic', topicId: 1}},
        groupRule = {from: {id: '100', type: 'group'}},
        inTopic = {id: 21, replyTo: {forumTopic: true, replyToMsgId: 20}},
        replyInTopic = {id: 23, replyTo: {forumTopic: true, replyToMsgId: 22, replyToTopId: 20}},
        inGeneral = {id: 30},
        replyInGeneral = {id: 31, replyTo: {replyToMsgId: 30}};

    test('should accept any message for a rule without source topic', () => {
        expect(isMessageInRuleTopic(groupRule, forum, inTopic)).toBe(true);
        expect(isMessageInRuleTopic(groupRule, {}, inGeneral)).toBe(true);
    });

    test('should accept messages and replies of the rule topic', () => {
        expect(isMessageInRuleTopic(topicRule, forum, inTopic)).toBe(true);
        expect(isMessageInRuleTopic(topicRule, forum, replyInTopic)).toBe(true);
    });

    test('should skip messages of other topics', () => {
        expect(isMessageInRuleTopic(topicRule, forum, inGeneral)).toBe(false);
        expect(isMessageInRuleTopic(generalRule, forum, inTopic)).toBe(false);
    });

    test('should accept messages and replies of the "General" topic', () => {
        expect(isMessageInRuleTopic(generalRule, forum, inGeneral)).toBe(true);
        expect(isMessageInRuleTopic(generalRule, forum, replyInGeneral)).toBe(true);
    });

    test('should skip topic rules when the source is not a forum', () => {
        expect(isMessageInRuleTopic(topicRule, {forum: false}, inTopic)).toBe(false);
    });
});
