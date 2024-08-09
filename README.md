# Telegram Forward User Bot

A Telegram "bot" working as a user, using MTProto via [gramjs](https://github.com/gram-js/gramjs), to forward messages between chats/groups/channels. Configurable via Bot menu.

## Table of Contents

- [Telegram Forward User Bot](#telegram-forward-user-bot)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Running Locally](#running-locally)
    - [Running in Docker](#running-in-docker)
  - [Command Line Options](#command-line-options)
  - [Configuration via Telegram Bot Menu](#configuration-via-telegram-bot-menu)
    - [Accessing the Bot Menu](#accessing-the-bot-menu)
    - [Configuration Options](#configuration-options)
      - [Menu Language](#menu-language)
      - [Refresh Interval](#refresh-interval)
      - [Max Columns in Row](#max-columns-in-row)
      - [Text Summary Max Length](#text-summary-max-length)
      - [Space Between Columns](#space-between-columns)
      - [Max Buttons on "Page"](#max-buttons-on-page)
      - [Additional Users](#additional-users)
  - [Scripts](#scripts)
  - [License](#license)
  - [Author](#author)


## Prerequisites

- Node.js (version 22 or later)
- npm (version 7 or later)
- Docker (optional, for running in a container)

## Installation

1. Clone the repository:

    ```sh
    git clone https://github.com/yourusername/telegram-forward-user-bot.git
    cd telegram-forward-user-bot
    ```

2. Install the dependencies:

    ```sh
    npm install
    ```

## Usage

### Running Locally

1. Start the bot:

    ```sh
    npm start
    ```

2. For debugging:

    ```sh
    npm run debug
    ```

3. For help:

    ```sh
    npm run help
    ```

### Running in Docker

1. Build the Docker image:

    ```sh
    docker build -t telegram-forward-user-bot .
    ```

2. Run the Docker container:

    ```sh
    docker run -it --rm --name telegram-forward-user-bot telegram-forward-user-bot
    ```

## Command Line Options

The Telegram Forward User Bot supports several command line options to customize its behavior. Below are the available options:

- `-r, --refresh-interval <number>`: Refresh information from Telegram servers, in seconds. Default is 300 seconds.
- `-b, --no-bot`: Start without the bot instance.
- `-d, --debug`: Enable debug level logging.
- `--debug-client-user`: Enable debug level logging for the client "user" instance.
- `--debug-client-bot`: Enable debug level logging for the client "bot" instance.
- `-c, --command <string>`: Test menu command from the command line.
- `-h, --help`: Display help information.
- `--version`: Display the version of the script.


## Configuration via Telegram Bot Menu

The Telegram Forward User Bot can be configured directly through its interactive bot menu. Below are the steps and options available for configuration:

### Accessing the Bot Menu

1. Start the application.

2. Open Telegram and start a chat with your bot. The chat between a bot and user used by application to work with sources will be created after first start

3. Use the ```/start``` command to show the menu.

### Configuration Options

The bot menu provides several configuration options to customize the behavior of the bot. Below are the available options:

#### Menu Language

- **Label**: Menu language
- **Description**: Language of the Menu
- **Default**: The default locale set in the configuration.

#### Refresh Interval

- **Label**: Refresh interval
- **Description**: Interval to refresh data from Telegram servers in seconds
- **Type**: Number (integer)
- **Options**: Minimum 30 seconds, Maximum 900 seconds, Step 10 seconds
- **Default**: 300 seconds

#### Max Columns in Row

- **Label**: Max columns in row
- **Description**: Max count of columns in one row of the menu
- **Type**: Number (integer)
- **Options**: Minimum 0, Maximum 10, Step 1
- **Default**: 3 columns

#### Text Summary Max Length

- **Label**: Text summary max length
- **Description**: Approximated max length of the text in one row of the menu
- **Type**: Number (integer)
- **Options**: Minimum 0, Maximum 100, Step 1
- **Default**: 50 characters

#### Space Between Columns

- **Label**: Space between columns
- **Description**: Space between columns in the menu
- **Type**: Number (integer)
- **Options**: Minimum 1, Maximum 5, Step 1
- **Default**: 2 characters

#### Max Buttons on "Page"

- **Label**: Max buttons on "page"
- **Description**: Max count of buttons on one "page" of the menu
- **Type**: Number (integer)
- **Options**: Minimum 10, Maximum 50, Step 1
- **Default**: 30 buttons

#### Additional Users

- **Label**: Additional users
- **Description**: List of additional users, except the primary one
- **Type**: Array
- **Default**: []


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