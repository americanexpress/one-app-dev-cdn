# Contributing to one-app-dev-cdn

✨ Thank you for taking the time to contribute to this project ✨

## Code of Conduct

This project adheres to the American Express [Code of Conduct](https://github.com/americanexpress/one-app-dev-cdn/blob/master/CODE_OF_CONDUCT.md). By contributing, you are expected to honor these guidelines.

## Developing

### Installation

1. Fork the repository `one-app-dev-cdn` to your GitHub account.
2. Afterwards run the following commands in your terminal

    ```bash
    $ git clone https://github.com/<your-github-username>/one-app-dev-cdn
    $ cd one-app-dev-cdn
    ```

   > replace `your-github-username` with your github username

3. Install the dependencies by running

    ```bash
    $ cd npm install
    ```

4. You can now run any of this scripts from the root folder.

#### Running and cleaning the build files

`npm run build`

Builds the module into the `lib` folder.

`npm run clean`

This removes any existing files generated during the build process and ensures that any new build is clean.

#### Running tests

`npm test`

Runs `eslint` **and** unit tests on the current branch.

`npm posttest`

Runs linting on the current branch and checks that the commits follow [conventional commits](https://www.conventionalcommits.org/)

## Submitting a new feature

When submitting a new feature request or enhancement of an existing features please review the following:-

### Is your feature request related to a problem

Please provide a clear and concise description of what you want and what your use case is.

### Provide an example

Please include a snippets of the code of the new feature.

### Describe the suggested enhancement

A clear and concise description of the enhancement to be added include a step-by-step guide if applicable.
Add any other context or screenshots or animated GIFs about the feature request

### Describe alternatives you've considered

A clear and concise description of any alternative solutions or features you've considered.

## Reporting bugs

All issues are submitted within GitHub issues. Please check this before submitting a new issue.

### Describe the bug

A clear and concise description of what the bug is.

### Provide step-by-step guide on how to reproduce the bug

Steps to reproduce the behavior, please provide code snippets or a link to repository

### Expected behavior

Please provide a description of the expected behavior

### Screenshots

If applicable, add screenshots or animated GIFs to help explain your problem.

### System information

Provide the system information which is not limited to the below:

- OS: [e.g. macOS, Windows]
- Browser (if applies) [e.g. chrome, safari]
- Version of faux-cdn: [e.g. 5.0.0]
- Node version:[e.g 10.15.1]

### Security Bugs

Please review our [Security Policy](./SECURITY.md). Please follow the instructions outlined in the policy.

## Getting in contact

  - Join our [Slack channel](http://one-amex.slack.com) request an invite [here](https://join.slack.com/t/one-amex/shared_invite/enQtOTA0MzEzODExODEwLTlmYzI1Y2U2ZDEwNWJjOTAxYTlmZTYzMjUyNzQyZTdmMWIwZGJmZDM2MDZmYzVjMDk5OWU4OGIwNjJjZWRhMjY)

## Coding conventions

### Git Commit Guidelines

We follow [conventional commits](https://www.conventionalcommits.org/) for git commit message formatting. These rules make it easier to review commit logs and improve contextual understanding of code changes. This also allows us to auto-generate the CHANGELOG from commit messages.

Each commit message consists of a **header**, **body** and **footer**.

#### Header

The header is required and must not exceed 70 characters to ensure it is well-formatted in common git tools. It has a special format that includes a *type*, *scope* and *subject*:

Syntax:

```bash
<type>(<scope>): <subject>
```

#### Type

The *type* should always be lowercase as shown below.

##### Allowed `<type>` values:

* **feat** (new feature for the user)
* **fix** (bug fix for the user, not a fix to build scripts)
* **docs** (changes to documentation)
* **style** (formatting, missing semi colons, etc; no functional code change)
* **refactor** (refactoring production code, eg. renaming a variable)
* **test** (adding missing tests, refactoring tests; no production code change)
* **chore** (updating build/env/packages, etc; no production code change)

#### Scope

The *scope* describes the affected code. The descriptor may be a route, component, feature, utility, etc. It should be one word or camelCased, if needed:

```bash
feat(transactions): added column for quantity
feat(BalanceModule): initial setup
```

The commit headers above work well if the commit affects many parts of a larger feature. If changes are more specific, it may be too broad. To better clarify specific scopes, you should use a `feature/scope` syntax:

```bash
fix(transaction/details): missing quantity field
```

The above syntax helps reduce verbosity in the _subject_. In comparison, consider the following example:

```bash
fix(transaction): missing quantity field in txn details
```

Another scenario for scope is using a `route/scope` (or `context/scope`) syntax. This would be useful when a commit only affects a particular instance of code that is used in multiple places.

*Example*: Transactions may be shown in multiple routes/contexts, but a bug affecting transaction actions may only exist under the "home" route, possibly related to other code. In such cases, you could use the following format:

```bash
fix(home/transactions): txn actions not working
```

This header makes it clear that the fix is limited in scope to transactions within the home route/context.

#### Subject

Short summary of the commit. Avoid redundancy and simplify wording in ways that do not compromise understanding.

Good:

```bash
$ git commit -m "fix(nav/link): incorrect URL for Travel"
```

Bad:

```bash
$ git commit -m "fix(nav): incorrect URL for Travel nav item :P"
```

> Note that the _Bad_ example results in a longer commit header. This is partly attributed to the scope not being more specific and personal expression tacked on the end.

**Note regarding subjects for bug fixes:**

Summarize _what is fixed_, rather than stating that it _is_ fixed. The _type_ ("fix") already specifies the state of the issue.

For example, don't do:

```bash
$ git commit -m "fix(nav): corrected Travel URL"
```

Instead, do:

```bash
$ git commit -m "fix(nav): broken URL for Travel"
```


#### Body and Footer (optional)

The body and footer should wrap at 80 characters.

The **body** describes the commit in more detail and should not be more than 1 paragraph (3-5 sentences). Details are important, but too much verbosity can inhibit understanding and productivity -- keep it clear and concise.

The **footer** should only reference Pull Requests or Issues associated with the commit.

For bug fixes that address open issues, the footer should be formatted like so:

```bash
Closes #17, #26
```
and for Pull Requests, use the format:

```bash
Related #37
```

If a commit is associated with issues and pull requests, use the following format:

```bash
Closes #17, #26
Related #37
```
> Issues should always be referenced before pull requests, as shown above.

#### Piecing It All Together

Below is an example of a full commit message that includes a header, body and footer:

```bash
refactor(nav/item): added prop (isActive)

NavItem now supports an "isActive" property. This property is used to control the styling of active navigation links.

Closes #21
```