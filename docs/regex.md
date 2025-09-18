
## Special sites on REGEXP:

- [Site to test `RegExp` for Phyton](https://pythex.org/)
- [Regexone](https://regexone.com/)
- [Regex Classes](https://regexlearn.com/)
  - [Regex Classes 101](https://regexlearn.com/learn/regex101)


## Symbols and Classes of Characters

|        Symbol        | Use                                                        |  Symbol  | Use                                                                                                                                      |
| :------------------: | :--------------------------------------------------------- | :------: | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `*` , `+` , `.`, `?` | [Zero or more], [1 or more] ,  [any] , [optional (0 or 1)] |   `\b`   | **(empty string)** - matches empty string at word boundary (between \w and \W)                                                           |
|         `()`         | capture group                                              |   `\d`   | **(digit)** - any numeric digit from 0 to 9.                                                                                             |
|         `^`          | not                                                        |   `\s`   | **(whitespace: `[ \t\n\r\f\v]`)** - any space, tab, or newline character. (Think of this as matching “space” characters.)                |
|      `[a-zA-Z]`      | range of character                                         |   `\w`   | **(alphanumeric: [0-9a-zA-Z_])** - any letter, numeric digit, or the underscore character. Think of this as matching “word” characters.) |
|         `{}`         | repetition                                                 |   `\A`   | **(start of string)**                                                                                                                    |
|        `{n}`         | n-occurences                                               |   `\B`   | matches empty string NOT at word boundary                                                                                                |
|       `{m,n}`        | from m to n occurences                                     |   `\D`   | **(non-digit)** - any character that is NOT a numeric digit from 0 to 9.                                                                 |
|       `{m,n}?`       | from m to n occurences, the least                          |   `\S`   | **(non-whitespace)** - any character that is NOT a space, tab, or newline.                                                               |
|         `\`          | Escape character                                           |   `\W`   | **(non-alphanumeric)** - any character that is NOT a letter, numeric digit, or the underscore character.                                 |
|         `^`          | begin of string                                            |   `\Z`   | **(end of string)**                                                                                                                      |
|         `$`          | end of string                                              | `\g<id>` | matches a previously defined group                                                                                                       |


## Lookarounds

| Type                | Expression |   Example    | Result                         |
| :------------------ | :--------: | :----------: | :----------------------------- |
| Positive Lookahead  |   `(?=)`   | `\d+(?=PM)`  | Date: 4 Aug `3`PM              |
| Negative Lookahead  |   `(?!)`   | `\d+(?!PM)`  | Date: `4` Aug 3PM              |
| Positive Lookbehind |  `(?<=)`   | `(?<=\$)\d+` | Product Code: 1064 Price: $`5` |
| Negative Lookbehind |  `(?<!)`   | `(?<!\$)\d+` | Product Code: `1064` Price: $5 |



## VS Code

### How to replace text in VS Code using regexp:

| Description                                                                  |                     Search for                      | Replace with  |
| ---------------------------------------------------------------------------- | :-------------------------------------------------: | :-----------: |
| Replace ASCII inverted commas with LaTeX inverted commas                     |                    `"([^"]\*)"`                     |  ` ``$1'' `   |
| Replace <br> `1. N1 N2 (1969 - 2099)` <br> by <br> `1. N2, N1 (1969 - 2099)` | `(\d+\.\s+)(\w+)\s+(\w+)\s+(\(\d{4}\s+-\s+\d{4}\))` | `$1$3, $2 $4` |


## Examples of practical use

|        Item        |                          REGEXP                           |                     Exemplo(s)                      |                            Parte(s)                            |
| :----------------: | :-------------------------------------------------------: | :-------------------------------------------------: | :------------------------------------------------------------: |
|   Email address    |             `([\w\-.]+)@([\w\-]+\.\w+\.?\w*)`             |             `paulo.cunha.doc@gmail.com`             |               `(paulo.cunha.doc)`, `(gmail.com)`               |
| Brazilian postcode |              `(\d{2})[.]*(\d{3})-(\d{3}\b)`               |             `66050-520` ou `66.050-520`             |           `(66050)`, `(520)` ou `(66.050)`, `(520)`            |
|  Brazilian phone   |            `([\(\d{2}\)]*) (\d{5})-(\d{4}\b)`             |          `(91) 98113-5678` ou `98113-5678`          | `((91))`, `(98113)`, `(5678)` ou `(empty)` `(98113)`, `(5678)` |
|  Date dd/mm/yyyy   |                `\d{1,2}\/\d{1,2}\/\d{2,4}`                |                    `31/12/2023`                     |                          `31/12/2023`                          |
|  Date dd/mm/yyyy   |             `(\d{1,2})\/(\d{1,2})\/(\d{2,4})`             |                    `31/12/2023`                     |                    `(31)`, `(12)`, `(2023)`                    |
|  Date yyyy-mm-dd   | `(\d{4})-(0[1-9] or 1[0-2])-(0[1-9] or 12[0-9] or 3[01])` |                    `2023-12-31`                     |                    `(2023)`, `(12)`, `(31)`                    |
|  American Numbers  |              `^-?\d+(,\d+)*(\.\d+(e\d+)?)?$`              | `3.14529`, `-255.34`, `1.9e10`, `123,340.00`, `128` |                                                                |
|  Python functions  |                  `def\s+(\w+)\((.*)\):`                   |   `def transverse_check(directory, pattern="*"):`   |                                                                |
| Python functions 2 |                  `def\s+(_*\w*)\((.*)\)`                  |                                                     |                                                                |
| Expressions 'str'  |                        '[\w+\s*]+'                        |                       'text'                        |                         '([\w+\s*]+)'                          |
|        URIs        |              `^(\w+)://([\w\-\.]+)(:(\d+))?`              |                    figure below                     |                          figure below                          |

### URIs and URLs

![URI´s reached by regexp above](https://github.com/cunhapaulo/ReferenceCard/assets/28146759/498f777b-1ce4-411e-9d8e-3516300abdbc)
<center>
<figcaption><b>Fig. 1</b> - Item representation <code>^(\w+)://([\w\-\.]+)(:(\d+))?</code> in the table above.<figcaption>
</center>


## Python code to use regexp:

```python

import re

def main():

    # creates an regexp operator with the proper pattern
    # ATTENTION: use an raw string begining with 'r'

    cepREGEXP = re.compile(r"((\d{2})[.]*(\d{3})-(\d{3}\b))")

    # captures the result of pattern matching

    result = cepREGEXP.search("Na minha cidade o CEP é 66.040-100 ou 66050-520")

    # uses patterns found

    print(f"1. First CEP found: {result.group()}")
    print(f"2. First CEP found: {result.groups()}")

    # Finds all ucurrences

    results = cepREGEXP.findall("Na minha cidade o CEP é 66.040-100 ou 66050-520")

    for cep in results:
        print(f"> CEP found: {cep}")

if __name__ == "__main__":
    # calls the main funtion
    main()

```

- RESULT:

```
1.First CEP found: 66.040-100
2.First CEP found: ('66.040-100', '66', '040', '100')
> CEP found: ('66.040-100', '66', '040', '100')
> CEP found: ('66050-520', '66', '050', '520')
```

