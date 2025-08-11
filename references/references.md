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

| Callout Class | Description | Example of Use |
| :---: | :--- | :--- |
| **`.abstract`** | A callout for an abstract or summary, highlighted with a distinct light blue-green color. | `<div class="callout abstract"><h1>Abstract</h1><p>This is a brief summary of the presentation's content.</p></div>` |
| **`.bug`** | A callout used to highlight bugs or errors, colored in a reddish hue. | `<div class="callout bug"><h1>Bug</h1><p>The code has a bug that causes a crash on line 42.</p></div>` |
| **`.danger`** | A callout for dangerous or critical information, marked with a bold red. | `<div class="callout danger"><h1>Danger</h1><p>This process can cause data loss if not handled carefully.</p></div>` |
| **`.example`** | A callout to provide an example, using a purple color scheme. | `<div class="callout example"><h1>Example</h1><p>Here is an example of the correct syntax to use.</p></div>` |
| **`.failure`** | A callout to indicate a failure or something that didn't work, colored in a light red. | `<div class="callout failure"><h1>Failure</h1><p>The experiment failed due to an incorrect variable setting.</p></div>` |
| **`.info`** | A standard information callout, highlighted with a light blue background. | `<div class="callout info"><h1>Info</h1><p>This is important information you should know.</p></div>` |
| **`.note`** | A callout for general notes, similar to `.info` but with a slightly different shade of blue. | `<div class="callout note"><h1>Note</h1><p>Remember to save your work before closing the application.</p></div>` |
| **`.question`** | A callout for a question or a point that requires clarification, using a light yellow. | `<div class="callout question"><h1>Question</h1><p>Why do we use this particular algorithm here?</p></div>` |
| **`.quote`** | A callout designed for a quotation, with a grey background. | `<div class="callout quote"><h1>Quote</h1><p>“The only way to do great work is to love what you do.” - Steve Jobs</p></div>` |
| **`.success`** | A callout to indicate success or a positive outcome, using a light green color. | `<div class="callout success"><h1>Success</h1><p>The test case passed with no errors.</p></div>` |
| **`.tip`** | A callout for helpful tips or suggestions, marked with a blue-green color. | `<div class="callout tip"><h1>Tip</h1><p>Use a keyboard shortcut to speed up your workflow.</p></div>` |
| **`.todo`** | A callout for to-do items or tasks, highlighted with a light blue color. | `<div class="callout todo"><h1>To-Do</h1><p>Finish the documentation for the new feature.</p></div>` |
| **`.warning`** | A callout to display a warning, using an orange color scheme. | `<div class="callout warning"><h1>Warning</h1><p>This function will be deprecated in the next version.</p></div>` |

## Tags

| Tag/Class | Description | Main CSS Properties | Example of Use |
| :---: | :--- | :--- | :--- |
| `.additional-logos` | A container for displaying additional logos, primarily used in `section.logos`. It's designed to hold a paragraph containing images. | `background-color`, `display`, `position`, `padding`, `margin`, `left`, `top`, `height`, `min-width`, `width`, `max-width` | `<div class="additional-logos"><p><img src="logo1.svg" alt="logo 1"><img src="logo2.svg" alt="logo 2"></p></div>` |
| `.blank` | A slide layout for a blank page without a title, header, or footer. | `background`, `background-color`, `padding` | `<section class="blank"></section>` |
| `.boxed` | A container that creates a bordered box around its content, often used for highlighting single words or short phrases. | `border`, `border-radius`, `padding`, `display` | `<span class="boxed">Important</span>` |
| `.callout` | A versatile container for displaying highlighted information, such as warnings, tips, or quotes. It comes in various styles like `.info`, `.warning`, `.note`, etc. | `overflow`, `border-style`, `border-width`, `border-radius`, `margin`, `padding`, `mix-blend-mode` | `<div class="callout info"><h1>Info</h1><p>This is important information you should know.</p></div>` |
| `.chapter` | A slide layout for a chapter title page, featuring a large title and an alternative background color. It hides the header and footer. | `padding-left`, `background-image`, `background-color` | `<section class="chapter"><h1>Chapter 1</h1><h2>Introduction</h2></section>` |
| `.chapter-alt` | An alternative slide layout for a chapter title page with a different background color and a distinct heading style. It also hides the header and footer. | `padding-left`, `background-image`, `background-color` | `<section class="chapter-alt"><h1>Chapter 2</h1><h2>Advanced Concepts</h2></section>` |
| `.cols` | A container for arranging content in columns using flexbox. It's often used within a `section` to create a multi-column layout. | `display`, `gap`, `flex-direction` | `<section class="cols"><div>Content 1</div><div>Content 2</div></section>` |
| `.copyright` | A slide layout specifically for displaying copyright information in the footer, ensuring the footer is visible. | `opacity`, `bottom`, `left` | `<section class="copyright"><footer>Copyright 2025</footer></section>` |
| `.end` | The final slide layout, typically for a "Thank You" message. It has a distinctive background color and hides the header and footer. | `color`, `background-color`, `padding-right`, `padding-left`, `padding-top`, `font-size` | `<section class="end"><h1>Thank You!</h1></section>` |
| `.end-bg` | A variant of the `.end` slide layout that uses a background image. It also hides the header and footer. | `color`, `background-color`, `padding-right`, `padding-left`, `padding-top`, `font-size` | `<section class="end-bg"><img src="end-image.jpg" alt="end-bg"><h1>Thank You!</h1></section>` |
| `.figcaption` | A container for figure captions, which automatically increments a counter and formats the text. | `font-family`, `font-size`, `font-weight`, `color`, `text-align` | `<figcaption>This is a figure caption.</figcaption>` |
| `.grid-lrb` | A slide layout that uses a CSS grid to arrange content in a left-right-bottom pattern. | `display`, `grid-template-areas`, `grid-template-columns`, `gap` | `<section class="grid-lrb"><div class="glft">Left content</div><div class="grgt">Right content</div><div class="gbot">Bottom content</div></section>` |
| `.grid-tlr` | A slide layout that uses a CSS grid to arrange content in a top-left-right pattern. | `display`, `grid-template-areas`, `grid-template-columns`, `gap` | `<section class="grid-tlr"><div class="gtop">Top content</div><div class="glft">Left content</div><div class="grgt">Right content</div></section>` |
| `.highlight` | A class for highlighting text inline with a background color. | `padding`, `background-color` | `<p>This is <span class="highlight">highlighted text</span>.</p>` |
| `.multicolumn` | A container for arranging content in multiple columns using a CSS grid. | `display`, `grid-auto-flow`, `grid-gap` | `<div class="multicolumn"><div>Column 1</div><div>Column 2</div></div>` |
| `.nobrand` | A slide layout that removes the brand elements (header, footer, pagination), similar to `.blank`, but with different padding. | `background`, `background-color` | `<section class="nobrand"><h1>Content</h1></section>` |
| `.quote` | A slide layout specifically for displaying block quotes, with unique font styling, color, and padding. It hides the header and footer. | `background-color`, `font-family`, `font-size`, `line-height`, `text-align`, `padding-left`, `padding-right` | `<section class="quote"><p>This is a long quotation from a book.</p></section>` |
| `.quote.dark` | An alternative style for a quote slide with a darker background and different font properties. | `background-color`, `font-family`, `font-weight`, `font-size`, `line-height`, `padding-left`, `padding-right` | `<section class="quote dark"><p>Another style of quote.</p></section>` |
| `.references` | A slide layout for a list of references or bibliography. It has a specific background color, font styles, and a multicolumn grid. | `background`, `color`, `font-family`, `padding`, `line-height` | `<section class="references"><h1>References</h1><ul><li>Reference 1</li><li>Reference 2</li></ul></section>` |
| `.rows` | A container for arranging content in multiple rows using flexbox. It's often used within a `section` to create a stacked layout. | `display`, `gap`, `justify-content`, `flex-direction` | `<section class="rows"><div>Row 1</div><div>Row 2</div></section>` |
| `.tabcaption` | A container for table captions, which automatically increments a counter and formats the text. | `font-family`, `font-size`, `font-weight`, `color`, `text-align` | `<tabcaption>This is a table caption.</tabcaption>` |
| `.title` | The main title slide layout, defining the positioning and styling for the main title, subtitle, and other elements. | `padding-left`, `top`, `margin`, `height`, `padding`, `font-size`, `line-height`, `color`, `font-weight`, `display` | `<section class="title"><h1>Presentation Title</h1><h2>Subtitle</h2></section>` |
| `.title.academic` | A specialized title slide layout for academic presentations, with distinct font sizes, colors, and border styles for the title, subtitle, and author information. | `width`, `padding-bottom`, `line-height`, `font-size`, `font-weight`, `color`, `border-bottom` | `<section class="title academic"><h1>Academic Title</h1><h2>Subtitle</h2><h3>Author Name</h3></section>` |
| `.title-bg` | A variant of the `.title` slide layout that uses a background image. | `padding-left` | `<section class="title-bg"><img src="title-image.jpg" alt="title-bg"><h1>Title</h1></section>` |
| `.toc` | A slide layout for the table of contents. It features a side panel with a title and styled links. | `padding-left`, `padding-top`, `font-size`, `flex-flow` | `<section class="toc"><ul><li><a href="#">Section 1</a></li><li><a href="#">Section 2</a></li></ul></section>` |
| `.totalpages` | A slide layout for displaying the total number of pages in the footer. | `color`, `font-size`, `content`, `position`, `padding`, `left`, `width`, `margin` | `<section class="totalpages">Content</section>` |
| `code` | Inline code snippets. | `font-family`, `background-color`, `font-weight`, `border-radius` | `<p>Use the `print()` function.</p>` |
| `figcaption` | Figure captions. | `font-family`, `font-size`, `font-weight`, `color`, `text-align` | `<figcaption>Figure 1: This is a figure caption.</figcaption>` |
| `footer` | The footer of the slide, typically displaying the brand logo and a copyright notice. | `position`, `color`, `font-size`, `font-weight`, `margin`, `padding`, `top`, `right`, `left`, `bottom` | `<footer>Paulo Cunha - MarpX</footer>` |
| `h1` | The main heading of a slide. It has a specific position, color, and font style, and is often used for slide titles. | `top`, `position`, `color`, `font-size`, `font-weight`, `height`, `max-width`, `display`, `justify-content`, `align-items` | `<h1>My Presentation Title</h1>` |
| `h2`, `h3` | Subheadings of a slide. | `margin-top`, `margin-bottom` | `<h2>A Subtitle</h2><h3>A Section Heading</h3>` |
| `header` | The header of the slide, typically located at the bottom and used for specific content. | `position`, `bottom`, `margin`, `padding`, `text-align`, `left`, `color`, `font-weight`, `font-size`, `vertical-align`, `display`, `justify-content`, `align-items` | `<header>Additional Information</header>` |
| `img[alt~="center"]` | Images with an `alt` attribute containing the word "center." | `display`, `margin` | `<img src="image.jpg" alt="center">` |
| `img[alt~="end-bg"]` | Images with an `alt` attribute containing the word "end-bg." | `position`, `top`, `left`, `z-index` | `<img src="image.jpg" alt="end-bg">` |
| `img[alt~="title-bg"]` | Images with an `alt` attribute containing the word "title-bg." | `position`, `top`, `left`, `z-index` | `<img src="image.jpg" alt="title-bg">` |
| `li::marker` | The markers for list items. | `color` | `<ul><li>Item 1</li><li>Item 2</li></ul>` |
| `section` | The main container for a single slide. It defines global properties for the slide layout. | `font-size`, `font-weight`, `font-family`, `color`, `background`, `padding`, `background-size` | `<section><h1>Slide Content</h1></section>` |
| `section code` | Code blocks within a `section`. | `font-family`, `background-color`, `font-weight`, `border-radius` | `<section><code>Code goes here.</code></section>` |
| `section table` | Tables within a section. | `font-size`, `font-family` | `<section><table><tr><th>Header</th></tr></table></section>` |
| `strong` | Bolded text, used for emphasis. | `color`, `font-weight` | `<p>This is a <strong>strong</strong> point.</p>` |
| `sup` | Superscript text, primarily used for footnotes. | `color` | `<p>Text with a footnote.<sup class="footnote-ref">[1]</sup></p>` |
| `tr:hover` | Table rows when the mouse hovers over them. | `color`, `background` | `<table><tr><td>Hover over me</td></tr></table>` |

## All Constants

| Constant | Description |
| :--- | :--- |
| `--marpx-color-code` | Defines the background color for code blocks. |
| `--marpx-color-dark-grey` | Sets a dark grey color variable. |
| `--marpx-color-footnote-mark` | Specifies the color for footnote markers. |
| `--marpx-color-h1-bold` | Defines the color for bolded text within H1 headings. |
| `--marpx-color-highlight` | Sets the background color for highlighted text. |
| `--marpx-color-light-grey` | Sets a light grey color variable. |
| `--marpx-color-quote-background` | Sets the background color for quote slides. |
| `--marpx-color-quote-dark-background` | Sets the background color for dark-themed quote slides. |
| `--marpx-color-quote-dark-paragraph-background` | Defines the paragraph background color for dark-themed quotes. |
| `--marpx-color-quote-dark-strong` | Sets the color for strong text within dark-themed quotes. |
| `--marpx-color-quote-paragraph-background` | Defines the paragraph background color for regular quotes. |
| `--marpx-color-quote-strong` | Sets the color for strong text within regular quotes. |
| `--marpx-color-reference-header` | Specifies the color for headings on reference slides. |
| `--marpx-color-references-background` | Sets the background color for reference slides. |
| `--marpx-color-references-bold` | Defines the color for bolded text on reference slides. |
| `--marpx-color-subtitle` | Sets the color for subtitles. |
| `--marpx-color-table-border-bottom` | Specifies the color for the bottom border of table cells. |
| `--marpx-color-table-border-top` | Specifies the color for the top border of table cells. |
| `--marpx-color-table-header-background` | Sets the background color for table headers. |
| `--marpx-color-table-header-color` | Defines the text color for table headers. |
| `--marpx-color-table-hover` | Specifies the text color for a table row on hover. |
| `--marpx-color-table-hover-background` | Sets the background color for a table row on hover. |
| `--marpx-color-table-nth-child-color` | Sets the background color for even-numbered table rows. |
| `--marpx-font-quote` | Defines the font family for regular quotes. |
| `--marpx-font-quote-dark` | Defines the font family for dark-themed quotes. |
| `--marpx-font-table-family` | Sets the font family for tables. |
| `--marpx-font-table-size` | Specifies the font size for tables. |
| `--marpx-theme-brandlogo` | Defines the text for the brand logo in the footer. |
| `--marpx-theme-captiontext-figure` | Sets the prefix text for figure captions (e.g., "Fig. "). |
| `--marpx-theme-captiontext-table` | Sets the prefix text for table captions (e.g., "Table "). |
| `--marpx-theme-color` | A primary color for the theme, used in headings and other elements. |
| `--marpx-theme-color-agenda` | A specific color for the "Agenda" section. |
| `--marpx-theme-color-alt` | An alternative theme color, used for the chapter slide background. |
| `--marpx-theme-color-background` | The main background color for slides. |
| `--marpx-theme-color-bold` | Defines the color for general bolded text. |
| `--marpx-theme-color-font` | The default font color for the theme. |
| `--marpx-theme-font-family` | The primary font family for the entire theme. |
| `--marpx-titleslide-academic-author-color` | Sets the color for the author's name on an academic title slide. |
| `--marpx-titleslide-academic-author-size` | Specifies the font size for the author's name on an academic title slide. |
| `--marpx-titleslide-academic-background-color` | Sets the background color for the academic title slide. |
| `--marpx-titleslide-academic-border-color` | Defines the border color for elements on the academic title slide. |
| `--marpx-titleslide-academic-date-size` | Specifies the font size for the date on an academic title slide. |
| `--marpx-titleslide-academic-institute-size` | Specifies the font size for the institute's name on an academic title slide. |
| `--marpx-titleslide-academic-letter-spacing` | Sets the letter spacing for text on an academic title slide. |
| `--marpx-titleslide-academic-subtitle-color` | Sets the color for the subtitle on an academic title slide. |
| `--marpx-titleslide-academic-subtitle-font-weight` | Defines the font weight for the subtitle on an academic title slide. |
| `--marpx-titleslide-academic-subtitle-size` | Specifies the font size for the subtitle on an academic title slide. |
| `--marpx-titleslide-academic-title-color` | Sets the color for the main title on an academic title slide. |
| `--marpx-titleslide-academic-title-font-weight` | Defines the font weight for the main title on an academic title slide. |
| `--marpx-titleslide-academic-title-size` | Specifies the font size for the main title on an academic title slide. |
| `--marpx-titleslide-academic-titlepage-color` | Sets the general text color for the academic title slide. |