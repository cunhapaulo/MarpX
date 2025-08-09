# MarpX (work in progress!)
Marp themes still created with beauty and simplicity in mind. 
This is Marp Style 2.0

> **MarpX** — Beautiful, semantic, and powerful themes for Marp presentations.
> MarpX is the result of an effort to expand, redesign, optimize and improve my first Marp slide theme composition initiative [Marpstyle](https://github.com/cunhapaulo/marpstyle). Onde may say MarpX is Marpstyle 2.0.


![](./examples/images/cartoon/shawn001b.png)
<small>Shaun The Sheep - Copyright ©️ 2025 aardman animations ltd.</small>

## Overview

**MarpX** is a comprehensive suite of advanced, visually appealing, and highly customizable themes and utilities for [Marp](https://marp.app/), the Markdown presentation ecosystem.  
Designed for educators, researchers, and professionals, MarpX enables the creation of visually stunning, semantically rich, and accessible presentations with minimal effort.

---

## 💡 Interesting new features

MarpX is capable of:

- **Autonumbering** captions for figures (`<figcaption>`) and tables (`<tabcaption>`).
  |----| 
  |<img src="https://github.com/user-attachments/assets/20fc8710-f045-4b4c-8d83-5cb860bd6913" />|


- **Vertically centered alignment** of items within columns with (`<div class="vcenter">`<br> or `<div class="multicolumn vcenter">`).
  |----|
  |<img src="https://github.com/user-attachments/assets/c5883ea2-b478-4bfe-83e7-9860045b5592" />|
  
- Special slides for **quotes**(`<!-- _class: quote -->`), including a dark mode<br> version (`<!-- _class: quote dark -->`).
  |----|
  |<img src="https://github.com/user-attachments/assets/ab811965-1bb9-4f18-9c1c-3ca8d332ab58" />|
  |<img  src="https://github.com/user-attachments/assets/f8808677-8c11-43f0-a3f3-5108ed2785de" />|

---

## 🚀 Key Features

- **Multiple Slide Types:** Effortlessly create title, chapter, agenda, references, quotes, end/thank you, and other specialized slides.
- **Semantic Slide Classes:** Use intuitive Markdown comments (e.g., `<!-- _class: chapter -->`) to switch slide layouts and styles.
- **Multi-Column Layouts:** Easily build slides with flexible columns and grid-based layouts.
- **Advanced Table Styling:** Enjoy beautiful, readable tables with zebra striping, hover effects, and responsive design.
- **Custom Quotes:** Unified quote system with alternative styles (e.g., `quote dark`) for emphasis and variety.
- **References Section:** Dedicated formatting for bibliographies and reference slides, supporting academic standards.
- **Branding Support:** Seamlessly add logos, copyright, and custom footers.
- **Responsive and Scalable:** Optimized for FullHD, 16:9, and 4:3 aspect ratios.
- **Google Fonts Integration:** Modern, readable font choices for every context.
- **Accessible Colors:** Carefully curated palette for clarity, contrast, and accessibility.
- **Easy Customization:** Modify variables and classes to match your institution or personal style.

---

## 📦 Getting Started

1. **Clone or Download** this repository.
2. **Copy** the desired theme(s) and CSS files to your Marp project directory.
3. **Reference** the theme in your Markdown frontmatter:
   ```markdown
   ---
   marp: true
   theme: _marpx
   ---
   ```
4. **Use semantic classes** in your slides to unlock advanced layouts:
   ```markdown
   <!-- _class: chapter -->
   # Chapter Title

   <!-- _class: quote dark -->
   > "A beautiful quote."
   ```
5. **Export** your presentation using Marp CLI, VS Code extension, or Marp web tools.

---

## 🛠️ Customization

- **Theme Variables:**  
  Tweak colors, fonts, and layout variables in the CSS to match your branding or preferences.
- **Slide Classes:**  
  Combine multiple classes (e.g., `<!-- _class: quote alt -->`) for even more control.
- **Extend:**  
  Fork or extend MarpX to create your own variants and share with the community.

---

## 🙏 Credits

- Inspired by the [Marp](https://marp.app/) project and its contributors.
- Inspired by the work of [marp-template-hsmw](https://git.hs-mittweida.de/marp/marp-template-hsmw). Herzlichen Dank!
- Uses [Google Fonts](https://fonts.google.com/) for typography.
- Thanks to the open-source community for feedback, inspiration, and contributions.
- Special thanks to all educators, researchers, and professionals who value clarity and beauty in their presentations.

---

## 👤 Authorship

**MarpX** is authored and maintained by [Paulo Cunha](https://github.com/cunhapaulo), 2025.

For questions, suggestions, or contributions, please open an issue or pull request on GitHub.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

