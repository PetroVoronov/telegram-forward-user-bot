const {
    getMessageTopicId,
    getEnabledRulesForSource,
    isMessageInRuleTopic,
    getRuleKey,
    getMessageState,
    matchKeywords,
    applyRuleDefaults,
} = require('../../../src/modules/forwarding/rules');

describe('applyRuleDefaults', () => {
    test('should set the missing keywords group options to the values of the earlier behavior', () => {
        const rules = [{label: 'old', keywordsGroups: [{label: 'a'}, {label: 'b', caseSensitive: false}]}];
        expect(applyRuleDefaults(rules)).toBe(true);
        expect(rules[0].keywordsGroups[0].caseSensitive).toBe(true);
        expect(rules[0].keywordsGroups[1].caseSensitive).toBe(false);
    });

    test('should report no changes, if all options are set', () => {
        expect(applyRuleDefaults([{keywordsGroups: [{caseSensitive: true}]}])).toBe(false);
        expect(applyRuleDefaults([{label: 'no groups'}])).toBe(false);
        expect(applyRuleDefaults(undefined)).toBe(false);
        expect(applyRuleDefaults([null])).toBe(false);
    });
});

describe('matchKeywords', () => {
    const include = (keyword) => ({keyword, include: true}),
        exclude = (keyword) => ({keyword, include: false});

    test('should not match any message, if the rule has no keywords groups, as in the earlier versions', () => {
        expect(matchKeywords([], 'anything').matched).toBe(false);
        expect(matchKeywords(undefined, '').matched).toBe(false);
    });

    test('should match any message by the group without keywords', () => {
        expect(matchKeywords([{label: 'all', includeAll: true, keywords: []}], 'anything').matched).toBe(true);
    });

    test('should require some or all included keywords', () => {
        const some = [{includeAll: false, keywords: [include('alpha'), include('beta')]}],
            all = [{includeAll: true, keywords: [include('alpha'), include('beta')]}];
        expect(matchKeywords(some, 'only alpha here').matched).toBe(true);
        expect(matchKeywords(all, 'only alpha here').matched).toBe(false);
        expect(matchKeywords(all, 'alpha and beta').matched).toBe(true);
        expect(matchKeywords(some, 'nothing').matched).toBe(false);
    });

    test('should not match, if an excluded keyword is present', () => {
        const groups = [{includeAll: false, keywords: [include('sale'), exclude('sold out')]}];
        expect(matchKeywords(groups, 'sale today').matched).toBe(true);
        expect(matchKeywords(groups, 'sale today, sold out').matched).toBe(false);
    });

    test('should match case insensitive, if it is switched off in the group, including Cyrillic', () => {
        const groups = [{includeAll: false, caseSensitive: false, keywords: [include('Sale'), include('1 група')]}];
        expect(matchKeywords(groups, 'SALE today').matched).toBe(true);
        expect(matchKeywords(groups, 'Вмикаємо 1 ГРУПУ').matched).toBe(false);
        expect(matchKeywords(groups, 'Вмикаємо 1 Група').matched).toBe(true);
        expect(matchKeywords([{caseSensitive: false, keywords: [exclude('Sold Out')]}], 'all SOLD OUT').matched).toBe(false);
    });

    test('should match case sensitive by default, as in the earlier versions', () => {
        const groups = [{includeAll: false, keywords: [include('Sale')]}];
        expect(matchKeywords(groups, 'SALE today').matched).toBe(false);
        expect(matchKeywords(groups, 'Sale today').matched).toBe(true);
        expect(matchKeywords([{caseSensitive: true, keywords: [include('Sale')]}], 'SALE today').matched).toBe(false);
    });

    test('should apply the case option per group', () => {
        const groups = [
            {label: 'exact', keywords: [include('CODE')]},
            {label: 'any case', caseSensitive: false, keywords: [include('sale')]},
        ];
        expect(matchKeywords(groups, 'code only').matched).toBe(false);
        expect(matchKeywords(groups, 'Big SALE').matched).toBe(true);
    });

    test('should match by any group and report details per group', () => {
        const result = matchKeywords(
            [
                {label: 'first', includeAll: true, keywords: [include('alpha')]},
                {label: 'second', includeAll: false, keywords: [include('beta')]},
            ],
            'beta only',
        );
        expect(result.matched).toBe(true);
        expect(result.groups).toEqual([
            {label: 'first', includeAll: true, caseSensitive: true, includesFound: false, excludesNotFound: true},
            {label: 'second', includeAll: false, caseSensitive: true, includesFound: true, excludesNotFound: true},
        ]);
    });

    test('should treat the empty message as text without keywords', () => {
        expect(matchKeywords([{keywords: [include('alpha')]}], '').matched).toBe(false);
        expect(matchKeywords([{keywords: [exclude('alpha')]}], undefined).matched).toBe(true);
    });
});

describe('getRuleKey', () => {
    test('should differ for rules with the same source and different destinations', () => {
        const first = {from: {id: '100'}, to: {id: '200', topicId: 2}},
            second = {from: {id: '100'}, to: {id: '200', topicId: 9}};
        expect(getRuleKey(first)).not.toBe(getRuleKey(second));
    });

    test('should be the same for the same source and destination', () => {
        expect(getRuleKey({label: 'a', from: {id: '100', topicId: 3}, to: {id: '200'}})).toBe(
            getRuleKey({label: 'b', from: {id: '100', topicId: 3}, to: {id: '200'}}),
        );
    });
});

describe('getMessageState', () => {
    test('should convert the legacy number state', () => {
        expect(getMessageState(42)).toEqual({id: 42, editDate: 0, message: ''});
    });

    test('should keep the object state and fill the missing fields', () => {
        expect(getMessageState({id: 7, ids: [7, 8]})).toEqual({id: 7, ids: [7, 8], editDate: 0, message: ''});
    });

    test('should return null for the missing or invalid state', () => {
        expect(getMessageState(undefined)).toBeNull();
        expect(getMessageState(0)).toBeNull();
        expect(getMessageState({})).toBeNull();
    });
});

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
