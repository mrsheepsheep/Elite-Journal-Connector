// This is injected in order to allow page to background script communication
// Short function to reduce redundancy
function sendMessage(eventName, data) {
    console.log('Sending event:', eventName)
    window.postMessage({
        origin: 'Elite Dangerous Web Journal',
        eventName,
        data
    })
}

sendMessage('load')

// Listen for background-script messages. This will only work for single events, as full journal is sent as a response below
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    sendMessage('event', request.event)
});

// Listen for page-script messages
window.addEventListener("message", (message) => {
    console.log(message)
    if (message.source != window){
        console.log('Received untrusted message...')
        return // Do not trust other origins
    }
    if (message.data.origin && message.data.origin === 'Elite Dangerous Web Journal') {
        switch (message.data.eventName) {
            case 'getJournal':
                // Ask background script for journal data
                console.log('Asking for journal...')
                chrome.runtime.sendMessage({
                    getJournal: 'please'
                }, (response) => { // Get response from background
                    sendMessage('journal', response.journal)
                })
                break;
            default: break;
        }
    }
})