# Telegram Forward User Bot

[![Docker Image Version](https://img.shields.io/docker/v/petrovoronov/telegram-forward-user-bot)](https://hub.docker.com/r/petrovoronov/telegram-forward-user-bot)
[![Docker Pulls](https://img.shields.io/docker/pulls/petrovoronov/telegram-forward-user-bot)](https://hub.docker.com/r/petrovoronov/telegram-forward-user-bot)
[![GitHub license](https://img.shields.io/github/license/PetroVoronov/telegram-forward-user-bot)](LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/PetroVoronov/telegram-forward-user-bot)](https://github.com/PetroVoronov/telegram-forward-user-bot/commits/main)
[![GitHub issues](https://img.shields.io/github/issues/PetroVoronov/telegram-forward-user-bot)](https://github.com/PetroVoronov/telegram-forward-user-bot/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/PetroVoronov/telegram-forward-user-bot)](https://github.com/PetroVoronov/telegram-forward-user-bot/pulls)

## About

A Telegram "bot" working as a user, using MTProto via [gramjs](https://github.com/gram-js/gramjs), to forward messages between chats/groups/channels. Configurable via Bot menu.

## Description

This package provides a functionality to forward messages between chats/groups/channels using a Telegram API to work as a user.
It has a built-in bot to configure the behavior of the user instance.
The bot can be used to configure:

- the common parameters, such as setting the refresh interval, the number of columns in a row, the text summary max length, the space between columns, the max buttons on a "page", and additional users.
- The forwarding rules itself, such as the source chat and the destination chat, including the separate topics for "forums" and "super groups", and keywords or phrases to filter messages.

## Table of Contents

- [Telegram Forward User Bot](#telegram-forward-user-bot)
  - [About](#about)
  - [Description](#description)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
    - [Docker image installation](#docker-image-installation)
    - [Node.js installation from the source code](#nodejs-installation-from-the-source-code)
  - [Basic configuration parameters](#basic-configuration-parameters)
    - [Environment variables in case of working as telegram user (default):](#environment-variables-in-case-of-working-as-telegram-user-default)
  - [Command Line Options](#command-line-options)
  - [Running](#running)
    - [Running in Docker](#running-in-docker)
      - [Docker Volumes](#docker-volumes)
      - [Docker first run](#docker-first-run)
      - [Docker next runs](#docker-next-runs)
    - [Docker Compose](#docker-compose)
    - [Running Locally, i.e. via Node.js](#running-locally-ie-via-nodejs)
  - [Configuration via Telegram Bot Menu](#configuration-via-telegram-bot-menu)
    - [Accessing the Bot Menu](#accessing-the-bot-menu)
    - [Configuration Options](#configuration-options)
      - [Menu Language](#menu-language)
      - [Refresh Interval](#refresh-interval)
      - [Resubscribe Interval](#resubscribe-interval)
      - [Max Columns in Row](#max-columns-in-row)
      - [Text Summary Max Length](#text-summary-max-length)
      - [Space Between Columns](#space-between-columns)
      - [Max Buttons on "Page"](#max-buttons-on-page)
      - [Additional Users](#additional-users)
  - [Scripts](#scripts)
  - [License](#license)
  - [Author](#author)

## Prerequisites

Node.js or Docker installed.

- Node.js (version 22 or later) and npm (version 7 or later)
- Docker, for running in a container

## Installation

### Docker image installation

```sh
docker pull petrovoronov/telegram-forward-user-bot
```

### Node.js installation from the source code

1. Use the repository

   - Clone the repository:

   ```sh
   git clone https://github.com/PetroVoronov/telegram-forward-user-bot.git
   cd telegram-forward-user-bot
   ```

   - Or download the source code from the [latest release](https://github.com/PetroVoronov/telegram-forward-user-bot/releases/latest) and extract it.For example for the version 1.4.5:

   ```sh
   wget https://github.com/PetroVoronov/telegram-forward-user-bot/archive/refs/tags/v1.4.5.tar.gz    # download the source code
   tar -xzf v1.4.5.tar.gz    # extract the source code
   cd telegram-forward-user-bot-1.4.5    # change the directory
   ```

   or

   ```sh
   curl -L https://github.com/PetroVoronov/telegram-forward-user-bot/archive/refs/tags/v1.4.5.tar.gz | tar -xz    # download and extract the source code
   cd telegram-forward-user-bot-1.4.5    # change the directory
   ```

2. Install the dependencies:

   ```sh
   npm install
   ```

## Basic configuration parameters

Basic configuration parameters - i.e. Telegram API credentials and Bot authentication token should be set on first run. It can be passed as environment variables, or you can skip it and application will ask you to enter it interactively.

After the first run, the configuration will be stored in the configuration in the application data directory: `data/`.

### Environment variables in case of working as telegram user (default):

```sh
export TELEGRAM_USER_API_ID=your_telegram_api_id
export TELEGRAM_USER_API_HASH=your_telegram_api_hash
export TELEGRAM_BOT_AUTH_TOKEN=your_telegram_bot_auth_token
```

**Notices**:

- Take in account that environment variables have a higher priority than the data stored in the configuration file. So, if you pass the environment variables, the configuration file will be overwritten by the data from environment variables.

- Additionally, you have to keep in mind that the Telegram API credentials will be used to authenticate the user instance and on the first run the application will ask you to enter the phone number, the code from the Telegram, as well as the password if 2FA is enabled.

## Command Line Options

The Telegram Forward User Bot supports several command line options to customize its behavior. Below are the available options:

| Option                   | Short | Description                                                | Type    | Default | Required |
| ------------------------ | ----- | ---------------------------------------------------------- | ------- | ------- | -------- |
| `--refresh-interval`     | `-r`  | Refresh information from Telegram servers, in seconds.     | number  | 300     | No       |
| `--resubscribe-interval` | `-s`  | Resubscribe on changes in sources chats, in minutes.       | number  | 60      | No       |
| `--no-bot`               | `-b`  | Start without the bot instance.                            | boolean | false   | No       |
| `--debug`                | `-d`  | Enable debug level logging.                                | boolean | false   | No       |
| `--no-debug-cache`       |       | Disable debug level logging for the Cache instance.        | boolean | false   | No       |
| `--no-debug-menu`        |       | Disable debug level logging for the Menu instance.         | boolean | false   | No       |
| `--debug-client-user`    |       | Enable debug level logging for the client "user" instance. | boolean | false   | No       |
| `--debug-client-bot`     |       | Enable debug level logging for the client "bot" instance.  | boolean | false   | No       |
| `--command`              | `-c`  | Test menu command from the command line.                   | string  |         | No       |
| `--help`                 | `-h`  | Display help information.                                  | boolean | false   | No       |
| `--version`              |       | Display the version of the script.                         | boolean | false   | No       |

## Running

On first run the application will ask for user authentication and the missing configuration parameters interactively.

### Running in Docker

By default the application will run without any additional command-line options.

Due to the limitations of the Docker environment, the application will not be able to ask for the missing configuration parameters interactively. That's why you need to make a first run in interactive mode to provide the missing parameters.

#### Docker Volumes

**You must to map the application data directory to the container:**

- `/app/data` - for the application data, including the configurations and the some other actual data. Mandatory for the mapping!
  You can map in on any local directory on the host system or docker volume.

#### Docker first run

So, the first run should be like one of the following:

- to set all basic configuration parameters interactively:
  ```sh
  docker run -it --rm -v $(pwd)/data:/app/data --name telegram-forward-user-bot petrovoronov/telegram-forward-user-bot
  ```
- to set all basic configuration parameters via environment variables:
  ```sh
  docker run -it --rm -v $(pwd)/data:/app/data \
  -e TELEGRAM_USER_API_ID=your_telegram_api_id \
  -e TELEGRAM_USER_API_HASH=your_telegram_api_hash \
  -e TELEGRAM_BOT_AUTH_TOKEN=your_telegram_bot_auth_token \
  --name telegram-forward-user-bot petrovoronov/telegram-forward-user-bot
  ```
- If you want to pass additional command-line options, you can add them to the end of the command. For example, to set the refresh interval to 300 seconds and the resubscribe interval to 60 minutes:
  ```sh
  docker run -it --rm -v $(pwd)/data:/app/data \
  -e TELEGRAM_USER_API_ID=your_telegram_api_id \
  -e TELEGRAM_USER_API_HASH=your_telegram_api_hash \
  -e TELEGRAM_BOT_AUTH_TOKEN=your_telegram_bot_auth_token \
  --name telegram-forward-user-bot petrovoronov/telegram-forward-user-bot --refresh-interval 300 --resubscribe-interval 60
  ```

**Important notice: pass all later needed command-line options at first run!\***

After the first run the application will store the configuration parameters and additional info - please stop the container by pressing `Ctrl+C` and start it again with the commands from the next section.

#### Docker next runs

After the first run you can run the application with the same configuration parameters as the previous run without any additional command-line options.

To start the application, run the following command:

```sh
docker run telegram-forward-user-bot
```

To stop the application, run the following command:

```sh
docker stop telegram-forward-user-bot
```

### Docker Compose

To run the application using Docker Compose, create a `docker-compose.yml` file with the following content:

```yaml
version: '3'
services:
    telegram-forward-user-bot
        image: petrovoronov/telegram-forward-user-bot
        volumes:
            - ./data:/app/data
        environment:
            - TELEGRAM_USER_API_ID=your_telegram_api_id
            - TELEGRAM_USER_API_HASH=your_telegram_api_hash
            - TELEGRAM_BOT_AUTH_TOKEN=your_telegram_bot_auth_token
```

Replace `/path/to/your/config` with the actual paths on your system where you want to store the application config.

If you want to start the application with the additional command-line options, you can add them to the `command` section of the service definition.

```yaml
command: --refresh-interval 300 --resubscribe-interval 60
```

Then, run the following command to start the application:

```sh
docker-compose up -d
```

This will start the application with the specified configuration parameters.

### Running Locally, i.e. via Node.js

1. Start with the default configuration:

   ```sh
   npm start
   ```

2. If you want to run the application in debug mode:

   ```sh
   npm run debug
   ```

3. If you want to pass additional command-line options, for example, to set the refresh interval to 300 seconds and the resubscribe interval to 60 minutes:

   ```sh
   npm start -- --refresh-interval 300 --resubscribe-interval 60
   ```

## Configuration via Telegram Bot Menu

The Telegram Forward User Bot can be configured directly through its interactive bot menu. Below are the steps and options available for configuration:

### Accessing the Bot Menu

1. Start the application.

2. Open Telegram and start a chat with your bot. The chat between a bot and user used by application to work with sources will be created after first start

3. Use the `/start` command to show the menu.

[<img src="docs/images/bot-menu-initial.png" width="400"/>](docs/images/bot-menu-initial.png)

### Configuration Options

The bot menu provides several configuration options to customize the behavior of the bot.

[<img src="docs/images/bot-menu-configuration.png" width="400"/>](docs/images/bot-menu-configuration.png)

Below are the available options:

#### Menu Language

[<img src="docs/images/bot-menu-configuration-language.png" width="400"/>](docs/images/bot-menu-configuration-language.png)

Used to set the language of the menu. Currently, only four languages are supported: English, German, Ukrainian, and Russian.

#### Refresh Interval

Used to set the interval to refresh data from Telegram servers, in seconds. In some cases the "standard" subscription on changes in sources chats is not working properly, so this interval is used to refresh the not only a list of available chats, but also the messages in the sources chats.

[<img src="docs/images/bot-menu-configuration-refresh-interval.png" width="400"/>](docs/images/bot-menu-configuration-refresh-interval.png)

#### Resubscribe Interval

Used to set the interval to resubscribe on changes in sources chats, in minutes. The bot will try to resubscribe on changes in sources chats after this interval. Implemented to prevent the bot from losing the subscription on changes in sources chats.

[<img src="docs/images/bot-menu-configuration-resubscribe-interval.png" width="400"/>](docs/images/bot-menu-configuration-resubscribe-interval.png)

#### Max Columns in Row

Used to set the maximum count of columns in one row of the menu. Zero means that the bot will try to calculate the optimal count of columns in each rows individually based on the value of next parameter - [Text Summary Max Length](#text-summary-max-length).

[<img src="docs/images/bot-menu-configuration-max-columns.png" width="400"/>](docs/images/bot-menu-configuration-max-columns.png)

#### Text Summary Max Length

Used to set the approximated max length of the text in one row of the menu. The bot will try to calculate the optimal count of columns based on this value and the value of the previous parameter - [Max Columns in Row](#max-columns-in-row).

[<img src="docs/images/bot-menu-configuration-max-length.png" width="400"/>](docs/images/bot-menu-configuration-max-length.png)

#### Space Between Columns

Used to set the space between columns in the menu. The value is in characters.

[<img src="docs/images/bot-menu-configuration-space-between-columns.png" width="400"/>](docs/images/bot-menu-configuration-space-between-columns.png)

#### Max Buttons on "Page"

[<img src="docs/images/bot-menu-configuration-max-buttons-on-page.png" width="400"/>](docs/images/bot-menu-configuration-max-buttons-on-page.png)

Used to set the maximum count of buttons on one "page" or "screen" of the menu. If not all buttons fit on one "page", the bot will split them into multiple "pages", and the user will be able to navigate between them.

#### Additional Users

Used to add additional users to the bot. The primary user is the one who can access the bot menu and configure the bot. Additional users can be added to have an access to the bot menu and configure the bot as well.

[<img src="docs/images/bot-menu-configuration-additional-users.png" width="400"/>](docs/images/bot-menu-configuration-additional-users.png)

To add a new user, use the "Add" button.

[<img src="docs/images/bot-menu-configuration-additional-users-add-new.png" width="400"/>](docs/images/bot-menu-configuration-additional-users-add-new.png)

Then simple select appropriate one from the list of available users. The list of available users is limited to the users known by the primary user.

## Scripts

- `version`: Generates the version file.
- `lint`: Lints the codebase using ESLint.
- `start`: Starts the bot.
- `debug`: Starts the bot in debug mode.
- `help`: Displays help information.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author

Petro Voronov <petro.voronov@gmail.com>
