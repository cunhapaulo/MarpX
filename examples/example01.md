---
title: Introduction
description: Marp Presentation Example
author: Paulo Cunha
header: Instructions onthe use of MarpX
footer: Introduction to MarpX
lang: pt-br
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

---


# Figures and caption in multicolumn



<div class="multicolumn" align="center">

![h:350](/images/zeus.png) 
<span class="figcap">Deus Zeus</span>

![ h:350](/images/afrodite.png)
<span class="highlight">Afrodite</span>

![ h:350](/images/dionisio.png)
<span class="figcap">Dionísio</span>

![ h:350](/images/era.png)
<span class="figcap">Era</span>

</div>

---

# Figures and caption in multicolumn


-  `align="center"` in `<div class="multicolumn" align="center">`
-  `class="figcap"` in `<span class="figcap">God Zeus.</span>`
-  `class="highlight"` in `<span class="highlight">Afrodite</span>`
&nbsp;

<div class="multicolumn" align="center">

![h:250](/images/zeus.png) 
<span class="figcap">God Zeus.</span>

![h:250](/images/afrodite.png)
<span class="highlight">Afrodite</span>

<div align="left">

```css

<div class="multicolumn" align="center">

![h:350](/images/zeus.png) 
<span class="figcap">God Zeus.</span>

![h:350](/images/afrodite.png)
<span class="highlight">Afrodite</span>

</div>

</div>

``` 

</div>

---

# Colors
<div class="multicolumn" align="center">

 |    Code    |                                   Color                                   |
 | :--------: | :-----------------------------------------------------------------------: |
 | `#ffb600;` | <div style="width: 50px; height: 25px; background-color: #ffb600;"></div> |
 | `#A4C2F4;` | <div style="width: 50px; height: 25px; background-color: #A4C2F4;"></div> |
 | `#9FC5E8;` | <div style="width: 50px; height: 25px; background-color: #9FC5E8;"></div> |
 | `#C9DAF8;` | <div style="width: 50px; height: 25px; background-color: #C9DAF8;"></div> |
 | `#CFE2F3;` | <div style="width: 50px; height: 25px; background-color: #CFE2F3;"></div> |
 | `#f3f1ec;` | <div style="width: 50px; height: 25px; background-color: #f3f1ec;"></div> |
 | `#f3f1ec;` | <div style="width: 50px; height: 25px; background-color: #f3f1ec;"></div> |
 |            |                                                                           |


 |    Code    |                                   Color                                   |
 | :--------: | :-----------------------------------------------------------------------: |
 | `#3e6ceb;` | <div style="width: 50px; height: 25px; background-color: #3e6ceb;"></div> |
 | `#7389c4;` | <div style="width: 50px; height: 25px; background-color: #7389c4;"></div> |
 | `#8aa1e2;` | <div style="width: 50px; height: 25px; background-color: #8aa1e2;"></div> |
 | `#b8c2f9;` | <div style="width: 50px; height: 25px; background-color: #b8c2f9;"></div> |
 | `#bbc7e7;` | <div style="width: 50px; height: 25px; background-color: #bbc7e7;"></div> |
 | `#d8e2ec;` | <div style="width: 50px; height: 25px; background-color: #d8e2ec;"></div> |
 | `#ebf0fc;` | <div style="width: 50px; height: 25px; background-color: #ebf0fc;"></div> |
 |            |                                                                           |

</div>

---

<style scoped>

section {
    font-size: 16pt;
    /* font-family: 'Courier New', monospace; */
}

</style>


# Itens de Parametrização

<center>

| Item                       | Parâmetro                 | Description                 | Valor      |
| -------------------------- | ------------------------- | --------------------------- | ---------- |
|                            | `--marpx-theme-color`     | General color for the theme | #3e6ceb    |
|                            | `--marpx-theme-color-alt` | Color for Chapter slides    | #fa6400ff  |
| `<code>`                   | `--code-color`            | Background color            | #ffb70052  |
| `<span class="highlight">` | `--text-highlight`        | Highlight text              | #ffef0878  |
| `<span class="figcap">`    | `--figure-captiontext`    | Caption text for figures    | "Fig.: "   |
| `<span class="tabcap">`    | `--table-captiontext`     | Caption text for table      | "Tabela: " |
|                            |                           |                             |            |

<div class="tabcap"> Itens de parametrização no MarpX.</div>

</center>


<style>
    :root{

        --marpx-theme-color: #3e6ceb;
        --marpx-theme-color-alt: #fa6400ff;

        --code-bg: #006eff1e;
        --text-highlight: #ffef0878;
        --figure-captiontext: "Fig.: ";
        --table-captiontext: "Tabela: ";
    }
    
    .figcap, .tabcap{
        font-size: 16.5pt;
        color: black;
    }

    .figcap::before{
        color: var(--marpx-theme-color);
        content: var(--figure-captiontext);
    }   

    .tabcap::before{
        color: var(--marpx-theme-color);
        content: var(--table-captiontext);
    }   

    .highlight{
        padding: 0.2em 0.3em;
        background-color: var(--text-highlight);

    }

    code{
        background-color: var(--code-bg);
    }

</style>