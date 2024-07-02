const { I18n } = require('i18n');
const path = require('path');

const i18n = new I18n({
  locales: ['en', 'de', 'uk', 'ru'],
  defaultLocale: 'en',
  directory: path.join('./', 'locales'),
  retryInDefaultLocale: true,
});

module.exports = i18n;