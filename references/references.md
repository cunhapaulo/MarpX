# References 
Here you can find a list of all the directives available in MarpX.

|                       |                                    |                                      |                             |                            |
| :-------------------: | :--------------------------------: | :----------------------------------: | :-------------------------: | :------------------------: |
|   [biblio](#biblio)   |     [blockquote](#blockquote)      |            [cite](#cite)             |       [cite2](#cite2)       |    [columns](#columns)     |
| [columns3](#columns3) | [columns-center](#columns--center) | [columns3-center](#columns3--center) |  [cool-list](#cool--list)   | [cool-list2](#cool--list2) |
|    [table](#table)    |      [titlepage](#title-page)      |      [transition](#transition)       | [transition2](#transition2) |                            |

## Title Page:

You can use this directive to create a standardised start slide for your presentation. On this slide some basic information should be available, such as the title and subtitle of the presentation, the name of the author, the name of the institution associated with the presentation or the author, the date of the presentation.

### Example code and result:

[Back to top](#references)
### Transitions

        <!-- _class: biblio           -->
        <!-- _class: blockquote       -->
        <!-- _class: cite             -->
        <!-- _class: cite2             -->

        <!-- _class: columns          -->
        <!-- _class: columns3         -->
        <!-- _class: columns-center   -->
        <!-- _class: columns3-center  -->
        
        <!-- _class: cool-list        -->
        <!-- _class: cool-list2       -->
        <!-- _class: table            -->
        <!-- _class: title-page       -->
        <!-- _class: transition       -->
        <!-- _class: transition2      -->

## Correspondência entre classes do MarpStyle e o MarpX

| (old) MarpStyle | MarpX (new)                       |
| --------------: | :-------------------------------- |
|      `<biblio>` | `<references>`                    |
|  `<blockquote>` | `<quote>`                         |
|        `<cite>` | `<quote>`                         |
|       `<cite2>` | `<quote>`                         |
|     `<columns>` | `<div class="multicolumn"></div>` |
|    `<columns3>` | `<!-- _class: multicolumn -->`    |
|   `<cool>-list` | `<cool-list>`                     |
|  `<cool>-list2` | `<cool-list>`                     |
|       `<table>` | `<table>`                         |
|  `<title>-page` | `<title>`                         |
|  `<transition>` | `<!-- _class: chapter -->`        |
| `<transition2>` | `<!-- _class: subsection -->`     |
|              -- | `<figure>`                        |
|              -- | `<!-- _class: blank -->`          |
|                 | `<div class="callout warning">`   |
|                 |                                   |

### Callouts

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