# Hangul Practice

Serve the app with `python3 -m http.server 8000 --directory dist` and open
`http://localhost:8000`. The app needs no API key or dependencies.

Choose any combination of forms, then enter the requested informal polite
conjugation using a Korean input method or the optional on-screen keyboard.
The practice deck skips entries with no stored answer for the selected form.

## Dictionary audit

Edit `dist/dictionary.json` to add or correct entries. Each form stores an array
of accepted spellings or `null` when that form is excluded. Grading normalizes
Unicode and whitespace and compares against the stored answers.

Click **Audit dictionary** in the app and give the downloaded prompt and data
to an LLM of your choice. From the command line, `node audit.mjs` prints the
same prompt from the current dictionary, ready to pipe to an LLM CLI. Review
suggestions before editing the JSON. Run `node audit.mjs --build` after edits to
refresh the downloadable audit file.
