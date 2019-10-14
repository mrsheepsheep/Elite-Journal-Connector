// This is injected in order to allow page to background script communication
window.postMessage({
    source: 'Elite Journal Connector',
    command: 'loading'
})

chrome.runtime.sendMessage({
    ready: true
}, (response) => {
    console.log(response)
    for (event in response.fulljournal) {
        window.postMessage({
            source: 'Elite Journal Connector',
            command: 'journal',
            event: response.fulljournal[event]
        })
    }
    window.postMessage({
        source: 'Elite Journal Connector',
        command: 'loaded'
    })
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    window.postMessage({
        source: 'Elite Journal Connector',
        command: 'journal',
        event: request.data
    });
});