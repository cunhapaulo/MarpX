---
title: Introduction
description: Marp Presentation Example
author: Paulo Cunha
header: MarpX example
footer: Introduction to MarpX
lang: de
size: 16:9
paginate: true
theme: _marpx
transition: none
math: mathjax
marp: true
---

<!-- _class: title -->
# HSMW Marp Theme Directives and Classes

## Marp Presentation Example

---

# Directives

- Marpit Markdown uses extended syntax called “[Directives](https://marpit.marp.app/directives)”
- It can control your slide-deck theme, page number, header, footer, style, and so on.
- [Global directives](https://marpit.marp.app/directives?id=global-directives) are the setting value of the whole slide deck such as theme.
  - They are defined in the YAML-Header.
- [Local directives](https://marpit.marp.app/directives?id=local-directives) are the setting value per slide pages.
  - They are defined as HTML comments directly after the slide separator (`---`).
  - If a local directive starts with `_`, it only applies to the current slide.

---
# Minimal Example for Directives

```
---
marp: true
---

# A first slide

- foo

---
<!-- _class: chapter -->
# A Chapter

## Chapter is only affecting this slide

---
<!-- backgroundColor: aqua -->
# An Other Slide

- Starting from here, all slides have aqua background

```

---

# Useful Marpit Directives

- `paginate` to enable page numbers
  - `_paginate: hold` to have successive slides using the same number
- `header` and `footer` to set header and footer global or local

---

# Title Slides

- The theme offers some specially formatted slides
- Title slide without and with background image
  - `<!-- _class: title -->`
  - `<!-- _class: title-bg -->`
- (Title)Slides with additional contents
  - Copyright-Footer: `<!-- _class: title copyright-->`
  - Partner Logos `<!-- _class: title logos -->`
- `copyright` and `logos` may work with other classes
  - e.&thinsp;g. with agenda slides

---

# More Special Slides

- Agenda slide
  - `<!-- _class: agenda -->`
- Chapter slide
  - `<!-- _class: chapter -->`
- Thanks or End slide without and with background image
  - `<!-- _class: end -->`
  - `<!-- _class: end-bg -->`
- Slide with several columns
  - `<!-- _class: multicolumn -->`
- A blank slide
  - `<!-- _class: blank -->`
- A nearly blank slide
  - `<!-- _class: nobrand -->`

---
<!-- _class: title -->

# This is a title slide

## With subtitle

---
<!-- _class: title-bg -->

# A title slide

## Including a background image

![title-bg h:720](https://www.hs-mittweida.de/fileadmin/verzeichnisfreigaben/hsmw/studierende/bilder/campusrundgang_1_web.jpg)

---
<!-- _class: title copyright -->
# A title slide

## Including a footer

---
<!-- _class: agenda -->

- the
- agenda
- slide

---
<!-- _class: chapter -->

# A Chapter

## With subtitle

---
<!-- _class: end -->

# Thanks or End Slide

To see this slide in action, go to [last slide](#vielen-dank) in this presentation.

---
<!-- _class: end-bg -->

# Thanks or End Slide

To see this slide in action, go to [last slide](#vielen-dank) in this presentation.

![title-bg h:720](https://www.hs-mittweida.de/fileadmin/verzeichnisfreigaben/hsmw/studierende/bilder/campusrundgang_1_web.jpg)

---
<!-- _class: multicolumn -->
# Slide with two columns

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.

- Key points automatically create their own column.
- The columns are distributed automatically.

---
<!-- _class: multicolumn -->
# Slide with three columns

- Key points automatically create their own column.
- The columns are distributed automatically.
- One part of the slide must not be a bulleted list

A simple text or an image can be inserted here

- Key points automatically create their own column.
- The columns are distributed automatically.

---
<!-- _class: blank -->

# A Blank Slide

- A blank slide
- No header, no footer, no logo

---
<!-- _class: nobrand -->
# A Slide without branding

- No footer, no logo

---
<!-- _class: chapter -->
# HTML Classes

## Marp Presentation Example

---

# Again a Slide with columns

<div class="multicolumn">

- Content is only distributed over two columns
- Class `multicolumn` is used in a `div`

The individual columns are realized by the blocks created by Markdown

</div>

---

# Several columns on one part of the slide

On this slide, the content is only distributed over two columns in the lower area. The class `multicolumn` is used in a `div` for this purpose. The individual columns are realized by the blocks created by Markdown.


<div class="multicolumn">

- Lorem ipsum dolor sit amet
- consetetur sadipscing elitr
- sed diam nonumy eirmod tempor

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.

</div>

Display errors are often caused by missing empty rows. There should therefore always be an empty line before and after HTML tags such as `div`.

---

# Footnotes

Footnotes¹ are not implemented as an actual function². Rather, a special area³ is formatted at the end of a slide with `<footnote> ... </footnote>`. The references on the slide are simulated by superscript text.⁴

<footnote>

1. this is a footnote and can be used for references.
1. this is a footnote
1. this is a footnote
1. this is a footnote

</footnote>

---
<!-- _class: chapter -->
# Callouts

## Marp Presentation Example

---

# Callouts

<div class="callout">

# Info

Text for information with **Markdown** formatting.

</div>

## Using Callouts

```md

<div class="callout">

# Info

Text for information with **Markdown** formatting.

</div>

```

---

# Callouts

## Variants

<div class="multicolumn">

<div class="callout warning">

# Warning

Text in the callout and the css class name
`callout warning`

</div>

<div class="callout note">

# Hint

Text in the callout and the css class name
`callout note`

</div>

<div class="callout abstract">

# Summary

Text in the callout and the css class name
`callout abstract`

</div>

</div>

<div class="multicolumn">

<div class="callout todo">

# ToDo

Text in the callout and the css class name
`callout todo`

</div>

<div class="callout tip">

# Tip

Text in the callout and the css class name
`callout tip`

</div>

<div class="callout success">

# Success

Text in the callout and the css class name
`callout success`

</div>

</div>

---

# Callouts

## Varianten

<div class="multicolumn">

<div class="callout question">

# Question

Text in the callout and the css class name
`callout question`

</div>

<div class="callout failure">

# Failure

Text in the callout and the css class name
`callout failure`

</div>

<div class="callout danger">

# Danger

Text in the callout and the css class name
`callout danger`

</div>

</div>
<div class="multicolumn">

<div class="callout bug">

# Bug

Text in the callout and the css class name
`callout bug`

</div>

<div class="callout example">

# Example

Text in the callout and the css class name
`callout example`

</div>

<div class="callout quote">

# Quote

Text in the callout and the css class name
`callout quote`

</div>
</div>

---

# Callout

## Callout variants can be stacked as desired

<div class="callout quote">

# Quote

Text in the callout.

<div class="callout exmaple">

# Info

Text in the inner callout.

</div>

</div>

---
<!-- _class: end -->
# Vielen Dank

**Max Muster**
Professur oder andere Zugehörigkeit

**Hochschule Mittweida** | University of Applied Sciences
Technikumplatz 17 | 09648 Mittweida

Fakultät Beispielfakultät | Fachgruppe der Fakultät

&phone; +49&thinsp;3727&thinsp;58-0000
&#x1F581; +49&thinsp;100&thinsp;000&thinsp;000

&#x1F585; [max.muster@hs-mittweida.de](mailto:max.muster@hs-mittweida.de)

Haus 00 | Name-des-Baus | Raum 00-100
Straße Nr | 09648 Mittweida

<!-- markdownlint-disable-file MD013 -->
<!-- markdownlint-disable-file MD025 -->
<!-- markdownlint-disable-file MD033 -->

<script>
    const date = new Date();
    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const day = ("0" + date.getDate()).slice(-2);
    document.getElementsByName("current_date").forEach(function(ele, idx) {
        ele.innerHTML = day + "." + month + "." + year;
    })
</script>

<style>
footer::before {
 content: "Version: GITREVISION | © ";
}
</style>
