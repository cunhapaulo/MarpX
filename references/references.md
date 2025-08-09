---
author: Paulo Cunha
marp: true
theme: marpx
size: banner
---
<!-- class: blank -->

<!-- _backgroundColor: rgba(210, 223, 241, 1) -->

# General Reference

## Callouts

|    Callout | Tag                              |
| ---------: | :------------------------------- |
|  `Warning` | `<div class="callout warning">`  |
|     `Note` | `<div class="callout note">`     |
| `Abstract` | `<div class="callout abstract">` |
|    `To Do` | `<div class="callout todo">`     |
|      `Tip` | `<div class="callout tip">`      |
|  `Success` | `<div class="callout success">`  |
| `Question` | `<div class="callout question">` |
|  `Failure` | `<div class="callout failure">`  |
|   `Danger` | `<div class="callout danger">`   |
|      `Bug` | `<div class="callout bug">`      |
|  `Example` | `<div class="callout example">`  |
|    `Quote` | `<div class="callout quote">`    |
|            |                                  |

## Tags

| Tag / Class                                             | Description / Purpose                         | Main CSS Properties                                                       |
| ------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| `.boxed`                                                | Highlighted box around text                   | border, border-radius, padding, display: inline-block                     |
| `.callout`, `.callout.*`                                | Callout blocks (info, warning, note, etc.)    | border, background, padding, margin, color by type                        |
| `.cols`, `section.cols`                                 | Flexible columns layout                       | display: flex, gap, flex-direction: row                                   |
| `.highlight`                                            | Highlighted text                              | padding, background-color                                                 |
| `.multicolumn`, `section.multicolumn`                   | Multi-column layout for references or content | display: grid, grid-auto-flow: column, column-gap                         |
| `.rows`, `section.rows`                                 | Flexible rows layout                          | display: flex, flex-direction: column, gap                                |
| `div.additional-logos`                                  | Container for additional logos                | display: block, position: absolute, size, background-color                |
| `div.callout>h1`                                        | Callout block title                           | font-size, font-weight, color, margin, padding                            |
| `figcaption`, `.figcaption`                             | Figure caption with automatic numbering       | font-family, font-size, font-weight, color, text-align, counter-increment |
| `footer`                                                | Slide footer                                  | position, color, font-size, font-weight, margin                           |
| `footer::after`                                         | Brand logo in footer                          | content: var(--marpx-theme-brandlogo)                                     |
| `footer::before`                                        | Copyright symbol in footer                    | content: "©️ "                                                           |
| `footnote`, `footnote>ol`                               | Footnote area and list                        | border-top, font-size, margin                                             |
| `h1`, `h2`, `h3`, `h4`                                  | Slide headings                                | color, font-size, font-weight, margin, position                           |
| `header`                                                | Slide header                                  | position, color, font-size, font-weight, margin                           |
| `img[alt~="center"]`                                    | Centered image                                | display: block, margin: auto                                              |
| `img[alt~="end-bg"]`, `img[alt~="title-bg"]`            | Background images for end/title slides        | position: absolute, z-index                                               |
| `li::marker`                                            | List item marker                              | color                                                                     |
| `section`                                               | Main slide container                          | font-size, font-family, color, background, padding                        |
| `section.agenda`                                        | Agenda/content slide                          | padding, font-size, background, pseudo-element ::before                   |
| `section.blank`                                         | Blank slide                                   | background: none, padding, hides header/footer                            |
| `section.chapter`                                       | Chapter slide                                 | padding, background-color, large headings                                 |
| `section.chapter-alt`                                   | Alternative chapter slide                     | padding, background-color: white, large headings                          |
| `section.copyright`                                     | Copyright slide                               | footer visible, position adjusted                                         |
| `section.end`, `section.end-bg`                         | Thank you slide                               | background-color, color: white, padding, font-size, hides footer/header   |
| `section.grid-lrb`                                      | Grid layout: left, right, bottom              | display: grid, grid-template-areas                                        |
| `section.grid-tlr`                                      | Grid layout: top, left, right                 | display: grid, grid-template-areas                                        |
| `section.logos`                                         | Slide with additional logos                   | contains `.additional-logos` div                                          |
| `section.multicolumn.vcenter`                           | Vertically centered multi-column layout       | align-items: center                                                       |
| `section.nobrand`                                       | Slide without branding                        | background: none, hides header/footer                                     |
| `section.quote`                                         | Quote slide (unified)                         | background-color, centered text, font-size, padding                       |
| `section.quote.dark`                                    | Alternative quote slide (dark background)     | background-color, centered text, font-size, padding                       |
| `section.references`                                    | References/bibliography slide                 | background, color, font-family, padding, line-height, font-size           |
| `section.references .multicolumn`                       | Multi-column grid for references              | display: grid, column-gap, align-items                                    |
| `section.references li`                                 | List item in references                       | margin-bottom                                                             |
| `section.references strong`                             | Bold text in references                       | font-weight, color                                                        |
| `section.references h1, h2`                             | Headings in references                        | color, font-family, font-weight, margin-bottom                            |
| `section.table`, `section table th`, `section table td` | Tables                                        | font-size, font-family, background, border, color                         |
| `section.title`, `section.title-bg`                     | Title slide (with or without background)      | padding, heading position, font-size, color                               |
| `section.totalpages`                                    | Slide showing total pages                     | ::after with pagination, font-size, color                                 |
| `sup`, `section sup`                                    | Superscript and footnote marker               | color                                                                     |
| `tabcaption`, `.tabcaption`                             | Table caption with automatic numbering        | font-family, font-size, font-weight, color, text-align, counter-increment |
| `tr:hover`                                              | Table row hover effect                        | color, background                                                         |


## All Constants

| Constant                                        | Description / Use                                              |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `--marpx-color-dark-grey`                       | Dark gray color, used for text or backgrounds.                 |
| `--marpx-color-footnote-mark`                   | Color for footnote markers (superscript numbers).              |
| `--marpx-color-highlight`                       | Background color for highlighted text (.highlight).            |
| `--marpx-color-light-grey`                      | Light gray color, used for text or backgrounds (e.g., footer). |
| `--marpx-color-quote-background`                | Background color for unified quote slides (section.quote).     |
| `--marpx-color-quote-dark-background`           | Background color for dark quote slides (section.quote.dark).   |
| `--marpx-color-quote-dark-paragraph-background` | Background color for paragraphs in dark quote slides.          |
| `--marpx-color-quote-dark-strong`               | Color for strong text in dark quote slides.                    |
| `--marpx-color-quote-paragraph-background`      | Background color for paragraphs in quote slides.               |
| `--marpx-color-quote-strong`                    | Color for strong text in quote slides.                         |
| `--marpx-color-reference-header`                | Color for headers in references slides.                        |
| `--marpx-color-references-background`           | Background color for references slides.                        |
| `--marpx-color-references-bold`                 | Color for bold text in references slides.                      |
| `--marpx-color-subtitle`                        | Color for subtitles (e.g., h2 in title slides).                |
| `--marpx-color-table-border-bottom`             | Border color for the bottom of tables.                         |
| `--marpx-color-table-border-top`                | Border color for the top of tables.                            |
| `--marpx-color-table-header-background`         | Background color for table headers.                            |
| `--marpx-color-table-header-color`              | Text color for table headers.                                  |
| `--marpx-color-table-hover`                     | Text color for table row hover effect.                         |
| `--marpx-color-table-hover-background`          | Background color for table row hover effect.                   |
| `--marpx-color-table-nth-child-color`           | Background color for even table rows.                          |
| `--marpx-font-quote`                            | Font family for unified quote slides.                          |
| `--marpx-font-quote-dark`                       | Font family for dark quote slides.                             |
| `--marpx-font-table-family`                     | Font family for tables.                                        |
| `--marpx-font-table-size`                       | Font size for tables.                                          |
| `--marpx-theme-brandlogo`                       | Content for the brand logo in the footer.                      |
| `--marpx-theme-captiontext-figure`              | Prefix text for figure captions (e.g., "Fig. ").               |
| `--marpx-theme-captiontext-table`               | Prefix text for table captions (e.g., "Table ").               |
| `--marpx-theme-color`                           | Main theme color, used for headings and accents.               |
| `--marpx-theme-color-agenda`                    | Background color for the agenda sidebar.                       |
| `--marpx-theme-color-alt`                       | Alternative theme color, used for chapter slides.              |
| `--marpx-theme-color-background`                | Main background color for slides.                              |
| `--marpx-theme-color-bold`                      | Color for bold text throughout the theme.                      |
| `--marpx-theme-color-font`                      | Main font color for slides.                                    |
| `--marpx-theme-font-family`                     | Main font family for slides.                                   |
