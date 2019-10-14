# Elite Journal Connector

This Chrome Web extension reads the game Journal and allows websites to read it without other tools.

# How to

As a website developer, you should look at the 'examples' folder to understand how communication works between the background, content and page scripts.

The extension will inject itself into the active tab once the user clicks the extension icon in the browser.

Retrieving journal events is as simple as the following:

```javascript
window.addEventListener("message", (event) => {
    if (event.data.source === 'Elite Journal Connector') { // Always check this
        switch (event.data.command) {
            case 'loading': // This event is the first message, extension is injected into the page.
                break;
            case 'loaded': // The extension has finished loading initial Journal data.
                break
            case 'journal': // Any Journal event
                if (this.loaded || this.fullJournal && !this.loaded)
                    this.parseEvent(event.data.event)
                break;
        }
    }
})
```

# ToDos

* Configure elite folder location