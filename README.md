# GregMAT GRE Vocabulary Learning Portal

A GitHub Pages-ready vocabulary learning portal for GregMAT GRE vocabulary practice.

## Available Groups

| Group | Word Range | Lesson | Mini Exam | Full Exam |
|---|---|---|---|---|
| Group 1 | Words 1–30 | Available | Available | [Open Exam](https://sajib-johir.github.io/gregmat-gre-vocab-group-1-exam/) |
| Group 2 | Words 31–60 | Available | Available | [Open Exam](https://sajib-johir.github.io/gregmat-gre-vocab-group-2-exam/) |
| Group 3 | Words 61–90 | Available | Available | [Open Exam](https://sajib-johir.github.io/gregmat-gre-vocab-group-3-exam/) |
| Group 4 | Words 91–120 | Available | Available | [Open Exam](https://sajib-johir.github.io/gregmat-gre-vocab-group-4-exam/) |
| Group 5 | Words 121–150 | Available | Available | [Open Exam](https://sajib-johir.github.io/gregmat-gre-vocab-group-5-exam/) |
| Groups 6–38 | Future ranges | Coming Soon | Coming Soon | Coming Soon |

## Features

- 38-group future-ready portal structure.
- Groups 1–5 added with complete vocabulary lesson text.
- 30 words per group.
- Expandable word cards.
- Search by word, meaning, Bangla, synonym, antonym, or usage.
- Learned-word progress tracking with localStorage.
- Built-in mini exam for each available group.
- Full exam buttons connected to external GitHub Pages EPort-style exams.
- Eye-soothing responsive UI for desktop and mobile.
- Bold and underlined focus-word highlighting inside examples.
- Backup lesson files in `backup-lessons/`.

## Files

```text
gregmat-gre-vocab-learning-portal/
├── index.html
├── group.html
├── style.css
├── script.js
├── README.md
├── data/
│   ├── groups-index.js
│   ├── group-01.js
│   ├── group-02.js
│   ├── group-03.js
│   ├── group-04.js
│   └── group-05.js
└── backup-lessons/
    ├── group-01-full-text.md
    ├── group-02-full-text.md
    ├── group-03-full-text.md
    ├── group-04-full-text.md
    └── group-05-full-text.md
```

## How to Open Locally

Open `index.html` in a browser.

## How to Deploy with GitHub Pages

1. Create a GitHub repository.
2. Upload all files and folders exactly as they are.
3. Go to repository **Settings → Pages**.
4. Select the main branch and root folder.
5. Save and open the published GitHub Pages link.

## How to Add a New Group

1. Add `data/group-XX.js`.
2. Add `backup-lessons/group-XX-full-text.md`.
3. Update the matching group object inside `data/groups-index.js`:

```js
lessonStatus: "available",
dataFile: "data/group-XX.js",
miniExamStatus: "available"
```

## How to Add a Full Exam Link

Update only `data/groups-index.js`:

```js
fullExamStatus: "available",
fullExamLink: "PASTE_GROUP_EXAM_LINK_HERE"
```

## Progress Tracking

Progress is saved only in the visitor's browser using localStorage. No login or server is required.
