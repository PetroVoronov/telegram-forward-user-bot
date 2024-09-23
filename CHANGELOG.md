# Changelog

## [1.3.0](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.2.2...v1.3.0) (2024-09-23)


### Miscellaneous Chores

* **deps:** Bump telegram from 2.25.4 to 2.25.11 ([36237e2](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/36237e2019981049d3e7315aecdac456b60b4992))
* Modify the `spaceBetweenColumns` configuration parameter maximum value ([08961bf](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/08961bf49fdfcb6fec1db29b00346f1fdbcd790a))


### Features

* Refactor code to make `telegram-menu-structured` fully independent from Telegram Client or Bot library ([08961bf](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/08961bf49fdfcb6fec1db29b00346f1fdbcd790a))


### Code Refactoring

* Refactor to accept command only as Bot via Bot Menu ([6679b03](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/6679b03ddb21b78e21a09b8e2bfaeb42beaa96c9))
* **telegram-menu-structured:** Get rid of dependency on external i18n object. Additionally property logger is converted to private. ([eb13300](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/eb133009287b009fadc9d35cc0ef010a5e8c3856))
* **telegram-menu-structured:** Improve `menuDefaults` to store and provide min, max and step for params. ([08961bf](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/08961bf49fdfcb6fec1db29b00346f1fdbcd790a))
* **telegram-menu-structured:** Refactor menu button classes to work only as Bot to simplify command handling ([6679b03](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/6679b03ddb21b78e21a09b8e2bfaeb42beaa96c9))
* **telegram-menu-structured:** Refactor MenuItem class to handle command checking and value setting ([5401c21](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/5401c215f259f6e9cd8bc852fbbbcfc326d57037))
* **telegram-menu-structured:** Refactor message editing and sending logic in MenuItem class to await approach with edit, send and delete Message ([0348289](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/034828932c0e641e2895051d600d766705d4b8d6))

## [1.2.2](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.2.1...v1.2.2) (2024-09-22)


### Code Refactoring

* Add resubscribe function call in resubscribeInit ([1721bd8](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/1721bd83dd8afc8928cb99ac35bf4e2753005046))

## [1.2.1](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.2.0...v1.2.1) (2024-09-21)


### Documentation

* Fix CHANGELOG.md ([1aff623](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/1aff62372e3955e8ca3efa2a7186770c8c93e513))

## [1.2.0](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.1.5...v1.2.0) (2024-09-21)


### Features

* Added a new command line option `-s, --resubscribe-interval <number>` to specify the interval for resubscribing on changes in source chats, in minutes. The default interval is 60 minutes. Appropriate code is implemented [5a2d59a](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/5a2d59ac53a6210901cf3afc0c7fd9f2d69c1402))


### Miscellaneous Chores

* **deps:** Bump telegram from 2.24.11 to 2.25.4 ([4e9b729](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/4e9b7291e0d22b6801bc27e54e55e7fdb66c99d6))


### Code Refactoring

* Change logic to set logger to the `menu` code ([b61bec4](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/b61bec4e8f88064283bb7924ce6bddfb64598042))
* Make forum topics data cached, to prevent overloading Telegram API by such requests. ([fce75cd](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/fce75cdb6478115e25d206b0ffab6417b31d4d43))
* menu initialization and drawing logic ([e4d7ac4](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/e4d7ac463e6020120f0c3ce42b95fc1261659e83))
* **menuStructured:** first step to make separate module ([85720d0](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/85720d08e853ef24c703c82dd98e97d1c70a04bb))
* **menuStructured:** Now the defaults was moved out from `MenuItem` class to a separate new `menuDefaults` object in the `MenuItem` file. ([b971ba3](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/b971ba3dafc620bd406fa9fe642371100c842c0d))
* Refactor `telegram-menu-structured`. ([07e03e5](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/07e03e5ece5b7060be6175d8483064ef5cfb4176))
* Refactor cache event registration in index.js and fix type conversion issue in refreshDialogs() ([c9a6dba](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/c9a6dbadfab41ea244a69b20082ce1dc15bdeb18))
* Refactor logging statements in Cache.js ([dfc6aa4](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/dfc6aa46b227f85564f2774ee724d6c66fcc7f49))
* Refactor menu logger import to use correct casing ([bfd8508](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/bfd8508e29a1d8da8b3d33e48b6b8cdfe3da8e7f))
* **telegram-menu-structured:** Updated the menu module to remove unused code and fix a typo in the comments. ([5a2d59a](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/5a2d59ac53a6210901cf3afc0c7fd9f2d69c1402))
* Update logic of representation and working with the menu defaults ([b971ba3](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/b971ba3dafc620bd406fa9fe642371100c842c0d))
* Update menu button creation logic. ([75d0632](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/75d063251b08fcecdb83cac4317b806bdbad7d73))
* Update menu initialization and drawing logic ([d8bdbbd](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/d8bdbbdcf9b8d330395f3a1a39a550a932fba617))

## [1.1.5](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.1.4...v1.1.5) (2024-09-16)


### Documentation

* Update CHANGELOG.md by previous changes ([bfc597d](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/bfc597d9981f8c434c6750f296f56434a1049b5a))


### Bug Fixes

* fix some variable declarations ([ebba407](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/ebba407f86f0073bdd4d718881510909eddf5a14))
* **logger:** make it secured, not show the sensitive information in logs ([ebba407](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/ebba407f86f0073bdd4d718881510909eddf5a14))


### Code Refactoring

* Refactor logging to reuse the logger from the `gramjs` ([ebba407](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/ebba407f86f0073bdd4d718881510909eddf5a14))

## [1.1.4](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.1.3...v1.1.4) (2024-09-15)


### Build System

* Update eslint-plugin-sonarjs to version 2.0.2 ([023ee56](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/023ee56c5f8786764e0b74c0014cee1f8e76798f))


### Continuous Integration

* Add `release-please-action` to prepare releases and `Changelog.md` ([f31b0e9](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/f31b0e95d7d174b63f06168c2c9995af73a5a555))


### Miscellaneous Chores

* Remove unused `genversion` dependencies and scripts ([f31b0e9](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/f31b0e95d7d174b63f06168c2c9995af73a5a555))


### Code Refactoring

* **docker:** Update npm install command to use 'npm ci' in Dockerfile and make it dependant on `TARGETPLATFORM`. ([f31b0e9](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/f31b0e95d7d174b63f06168c2c9995af73a5a555))
* Refactor MenuItemRoot class and light improvement of README.md ([3ddba9a](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/3ddba9ad7dcaac5b409fe86f59f6a6887ede3424))
* Refactor MenuItemRoot class and light improvement of README.md
    - Moving the MenuItemRoot class definition to MenuItemStructured.js
    - Updating the constructor of the MenuItemRoot class to accept a menuStructure parameter
    - Refactor a new MenuItemRoot class that extends the MenuItem class and initializes the menu structure
    - Added "badges" to README.md


## [1.1.3](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.1.2...v1.1.3) (2024-09-08)


### Reverts

* Return back storing last forwarded message content, to avoid forwarding messages on later edit ([c28eaa6](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/c28eaa63231b5edcfb356c30cbad3952002e970a))


## [1.1.2](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.1.1...v1.1.2) (2024-09-07)


### Bug Fixes

* Update name of workflow to build and push docker image ([efec570](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/efec570e012fcc9ad5cd34ac4c4216612b460e0d))

### Miscellaneous Chores

* Exclude message content comparison on `edit` event, not store message content on forward, code improvement related to the edited messages and update docker deployment workflow to include Docker Hub ([b090bf7](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/b090bf70053717b3db8bf948e8cf43e41ba4b71b))


## [1.1.1](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.1.0...v1.1.1) (2024-09-06)


### Continuous Integration

* Update docker deployment workflow to get back labels labels ([6fb411f](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/6fb411fc7415f9b54631e40b798f8cb804ebfdde))
* Update docker deployment workflow to exclude provenance ([77af43a](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/77af43ac3adc1d39e15aff06b60d88822e2a8db0))
* Update npm version in Dockerfile ([48a04d9](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/48a04d951297ac763d529b8582220eecfb44ad2e))
* Update docker deployment workflow to include metadata annotations ([dfc4b60](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/dfc4b600ec8842f91308b33c824246d2235433a5))
* Remove unused labels from docker deployment workflow ([76b225b](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/76b225b8b995acfa3e4326b35b06d7084219d0e1))

### Bug Fixes

* Add annotations to docker deployment workflow ([d4a3a37](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/d4a3a374b048116a7d2a25b8122f59bc1d7db76f))
* Docker building for arm64 ([b8a436e](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/b8a436ebd132d5c3731263cd4105a35249a5357c))


## [1.1.0](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.110...v1.1.0) (2024-09-06)


### Code Refactoring

* Added and-fast edit delay, improved logging on message forwarding, improved versions numeration approach ([51ce3a8](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/51ce3a846478d6e9eae834b00f45a9d60ffaad99))


## [1.0.110](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.104...v1.0.110) (2024-09-06)


### Miscellaneous Chores

* For edited messages added content compare ([e56f6da](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/e56f6dadc01e685923a2d965f41e141ee141039c))


## [1.0.104](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.103...v1.0.104) (2024-09-05)


### Miscellaneous Chores

* Show `forwardRule` state in menu (`enabled` or `disabled`) ([556a2d6](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/556a2d6df8fd5a06d6bb0b66ddbb2fee4a967410))


## [1.0.103](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.102...v1.0.103) (2024-09-05)


### Bug Fixes

* Fix catching missed messages on start ([bd499a4](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/bd499a4ab20899766f87d12c91a2b0e75ca47c2f))


## [1.0.102](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.101...v1.0.102) (2024-09-05)


### Bug Fixes

* Fix message edited debug logs on refresh ([6906e9b](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/6906e9bd3ba06282298f9f51ad8d565e1ae9afb2))


## [1.0.101](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.100...v1.0.101) (2024-09-05)


### Bug Fixes

* Fix message edited debug logs on refresh ([8538f56](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/8538f56b6a30abab2757e49d0a77e2dbaeb71598))


## [1.0.100](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.99...v1.0.100) (2024-09-05)


### Code Refactoring

* Improve debug logging on message reaction ([62f2e44](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/62f2e448b030c4b3470da47c1c5b8549de168a97))


## [1.0.99](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.98...v1.0.99) (2024-09-05)


### Code Refactoring

* Improve message check on refresh on start ([929e9aa](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/929e9aa47942c3dfd79dc0e59db0e21147738b61))


## [1.0.98](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.97...v1.0.98) (2024-09-05)


### Code Refactoring

* Improve message edited debug logs on refresh ([ea92c13](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/ea92c13d57d97f922ffa9c6a0159f77f37c9f23c))


## [1.0.97](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.96...v1.0.97) (2024-09-05)


### Code Refactoring

* Improve message edited detection on refresh ([a07c0a4](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/a07c0a47680ad8ebca415bd574eaa604359d9066))


## [1.0.96](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.95...v1.0.96) (2024-09-05)


### Miscellaneous Chores

* Another improve debug logging on refresh ([6200508](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/6200508956095e8f1e926973e6f7e4ec5f09f299))


## [1.0.95](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.94...v1.0.95) (2024-09-05)


### Miscellaneous Chores

* Improve debug logging on refresh ([1be5d95](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/1be5d95c98f7ef29ae1f3a76410a66d7ddd49ef4))


## [1.0.94](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.93...v1.0.94) (2024-09-05)


### Miscellaneous Chores

* Improve message edited detection on refresh ([508ad71](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/508ad71f82a50be47f063161d1266117bf7135e2))


## [1.0.93](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.92...v1.0.93) (2024-09-04)


### Bug Fixes

* Fix message retrieval using message IDs for edited messages via Refresh ([2588af1](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/2588af1a79a7b7a2fcaf4e8d9a8ac4d21e39390f))


## [1.0.92](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.91...v1.0.92) (2024-09-04)


### Miscellaneous Chores

* Store last processed message Id only if it has a higher Id then previous ([d07e64e](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/d07e64ef1b14092fd9d68e9c6c3ecae48c7ec525))


## [1.0.91](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.90...v1.0.91) (2024-09-04)


### Miscellaneous Chores

* Process last message for edits only one time via refresh ([1343f52](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/1343f521e09dbe46877d9dd5181b45df7eb5954c))


## [1.0.90](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.89...v1.0.90) (2024-09-04)


### Bug Fixes

* Fix applying the default values of `MenuItemStructured` using `structuredClone`, add missing translation key. ([b2f5554](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/b2f5554df9ccb0ed8fc0eb7b9d39487cd219fc58))


## [1.0.89](https://github.com/PetroVoronov/telegram-forward-user-bot/compare/v1.0.88...v1.0.89) (2024-09-03)

### Bug Fixes

* Change dev dependencies, fix Dockerfile. ([5b65c63](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/5b65c637f81c181ea716a0c4d9e446de698e46e7))


## 1.0.88 (2024-08-09)

### Miscellaneous Chores

* Update @eslint/js dependency to version 9.8.0 ([a9c422d](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/a9c422d345c1e85c6e8bcd140609afee43966e31))
* Merge pull request #13 from PetroVoronov/dependabot/npm_and_yarn/babel/core-7.25.2 ([6bb0434](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/6bb0434addb9d515287b316b891c9acf6c5b9ab5))
* Bump @babel/core from 7.24.9 to 7.25.2 ([645c642](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/645c642fef8119a4b6ad5595ec2777a4ff02a172))
* Merge pull request #14 from PetroVoronov/dependabot/npm_and_yarn/telegram-2.23.10 ([eff1fbd](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/eff1fbdc85e1741fcff485ecb31e8e3ee6dbbe1f))
* Bump telegram from 2.22.2 to 2.23.10 ([84dfe6c](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/84dfe6cac6952202fccc36e232f5c9f2f6712cb3))
* Merge pull request #11 from PetroVoronov/dependabot/npm_and_yarn/babel/eslint-parser-7.25.1 ([875d508](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/875d50831ae3b7965bf3f96041f318874b198c3b))
* Bump @babel/eslint-parser from 7.24.8 to 7.25.1 ([51c38f4](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/51c38f492900d906b8a05898d53fe6c4b3e9fad5))
* Merge pull request #10 from PetroVoronov/dependabot/npm_and_yarn/eslint-9.8.0 ([6931463](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/6931463dbcc2a858c70f19b7ada3efeb164f6fa0))
* Bump eslint from 9.7.0 to 9.8.0 ([ed98002](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/ed98002d6b0c806300feec8a4d0c081387664102))
* Readme.md - update bot menu configuration options with appropriate screenshots. ([19fb324](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/19fb324b40e6589bb326c66d6a8a64a7334d8ba7))

### Features

* Add conditional check before appending `MenuButtonDeleteItem` menu item ([59d7916](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/59d7916e34db276958e8c227fd2f26f4b3a01f01))

### Documentation

* Initial version of README.md ([bb6ca4f](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/bb6ca4f0a8b173034408f6c5813c02ba39884e14))


## 1.0.86 (2024-07-27)


### Code Refactoring

* Make `allowedUsers` configurable from a menu and improve `MenuItemStructured` class ([f019bc9](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/f019bc988198a467459268aebd68a5484ff4161a))
* Preparation to edit additional users to be allowed to use the bot via `Configuration`. ([b86ed1f](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/b86ed1f1ba7c2203ff93de0c46cb35531e47d77a))

## 1.0.85 (2024-07-24)

### Miscellaneous Chores

* Merge pull request #7 from PetroVoronov/dependabot/npm_and_yarn/babel/core-7.24.9 ([abcfea3](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/abcfea32ff292e6237f410148cdd09c31b6d69a5))
* Bump @babel/core from 7.24.7 to 7.24.9 ([aebeebb](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/aebeebbdd0aad1fc5fab7bfb482a87faa588f5fa))
* Merge pull request #8 from PetroVoronov/dependabot/npm_and_yarn/eslint-plugin-sonarjs-1.0.4 ([a58ef3a](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/a58ef3ad36dd86bbeb2c9eb8001463310c46afac))
* Bump eslint-plugin-sonarjs from 1.0.3 to 1.0.4 ([b10eec7](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/b10eec73913199bcdc0e7042c9e0b253980ae064))
* Merge pull request #4 from PetroVoronov/dependabot/npm_and_yarn/babel/eslint-parser-7.24.8 ([5d60454](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/5d604542253ee8638870fee00924797a9b23e5c3))
* Bump @babel/eslint-parser from 7.24.7 to 7.24.8 ([b159335](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/b159335017483281e81603660ca284e37164d78d))
* Merge pull request #5 from PetroVoronov/dependabot/npm_and_yarn/eslint-9.7.0 ([eabe805](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/eabe8055f78c5033ae2eeacfe918e4a53ce6d6ab))
* Bump eslint from 9.6.0 to 9.7.0 ([d204670](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/d204670d70afbb10530cfd520c98261202d7fd41))

### Miscellaneous Chores

* Update VSCode settings and MenuItemStructured class. Decrease the debug count and content. ([f6fb2bc](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/f6fb2bc942fc3f55845d895e58bccc32963f338d))

### Code Refactoring

* Add 'User' and 'Bot' types instead of `Chat`, with appropriate translations. ([f5903c3](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/f5903c3efa98fe6f69cd436373fcf194325ed551))

### Bug Fixes

* Fixed issues after previous commit, now edits of messages looks functional, as planned. Additionally fixed `eventHandlers` cleanup. ([cb249ff](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/cb249ff5a4cb996a65fd71687c1a126fea8a3abf))


## 1.0.83 (2024-07-22)


### Code Refactoring

* Preliminary preparation to catch edited messages, as event or direct check of `lastForwarded` or `lastProcessed` messages. ([ee034ab](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/ee034ab75d89c52daac6bf4f6eb3fae7e6a4afd9))


## 1.0.81 (2024-07-18)

### Code Refactoring

* Get rid of `includes` and `excludes`. Replace `message` by `universal` content with appropriate renaming. ([d3ebf57](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/d3ebf57ba253192da5137519d013b1d87d4e044a))
* In rules - universal structure is changed. Check of the universal keyword rules is implemented. ([5977220](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/5977220e9f6b4a28ac2dce4c7bfc0ed1fe6ee8b7))
* Improve debug for message handling ([053f495](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/053f49583cbce8bfdbe4e3684027b71a51e102c7))
* Improve handling of undefined messages in refreshDialogs function ([56954b6](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/56954b6fa5dd5cc19f2a55665633863a8acc1ea6))


## 1.0.71 (2024-07-16)

### Features

* Preparation for universal keywords rules functionality ([459cb47](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/459cb47c5d5f8c851a5453a561f09226c3b86d15))
* Add condition to check for null values in event message includes ([5d82468](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/5d824680006ac4da9536f46a9eb3edf2b2347c82))
* Add strftime dependency. Improving the logging. ([ea0adf6](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/ea0adf6de8b93f5390571d16d53b9274ffbb3ded))

### Code Refactoring

* Improve message forwarding logic and handling of null values in event message includes ([857e291](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/857e2916c564650665071aada1e8bdc19728add7))


## 1.0.70 (2024-07-15)

### Features

* Add process replay on forwarded message functionality. Fixed processing commands from "work" user. ([474d78e](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/474d78e86d62c36ac7ff815f971fd2df62dd5862))


## 1.0.69 (2024-07-14)

### Code Refactoring

* Make `fromIds` update only in `updateForwardListener`. ([73ce0f6](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/73ce0f6ffe3631cfee36785762527bba4429797a))
* Update event message includes check to handle null values (for true picture messages). ([4e9edef](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/4e9edef6a86458c554c5ddb7fb919e2f8a5d49bd))

### Bug Fixes

* Fix for `updateForwardListener`. ([d75d8d3](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/d75d8d3aad725dc9e2c191bfd2256d67e5aa5a04))


## 1.0.68 (2024-07-12)

### Miscellaneous Chores

* Update logging imports in MenuButton.js, MenuItemStructured and MenuItem.js ([7017b72](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/7017b72ec3261df78d2607fb5468a2fa84b2e108))


## 1.0.67 (2024-07-05)

### Miscellaneous Chores

* Merge pull request #2 from PetroVoronov/dependabot/npm_and_yarn/globals-15.8.0 ([8608d74](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/8608d74959a527f5b505608d3d6c8664b7ffd7df))
* Merge pull request #1 from PetroVoronov/dependabot/docker/node-22-alpine ([355ff08](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/355ff08b29064a09d4d4599b15991cd038c75fe7))
* Bump globals from 15.6.0 to 15.8.0 ([cffa729](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/cffa729613c40a3ef4536aba227afab5eb932f37))
* Bump node from 18-alpine to 22-alpine ([58a81ce](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/58a81cebfe2bc99bd6717c847562ec93e8e8c17f))


## 1.0.66 (2024-07-04)

### Miscellaneous Chores

* Create dependabot.yml ([848d565](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/848d5651e8317a9531ae388568827ea99b620151))
* Add locales folder to Dockerfile ([dfcdf88](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/dfcdf88eb420c7264e4a68fbee36b08b75f3befd))


## 1.0.65 (2024-07-03)

### Miscellaneous Chores

* Add "gramjs" to cspell.json ([c1dc8c7](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/c1dc8c767ef8ffd43bfb64184f9c78b284b32552))
* Add babel.config.json with "sourceType" set to "script" ([a4af91e](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/a4af91e6b82e7aa3a72dc76fdad9caaa15cce4fb))

### Bug Fixes

* Fix Dockerfile and `refreshDialogs`. ([077e3fb](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/077e3fbe439f1e1cb512b67c913f63ea31df18cf))


## 1.0.64 (2024-07-02)


### Features

* First public version. Primary features implemented. ([3d27e6e](https://github.com/PetroVoronov/telegram-forward-user-bot/commit/3d27e6e89cc0ddca004b8db7ef9732628ef8116e))
