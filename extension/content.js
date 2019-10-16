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

function onChromeMessageListener(request) {
    console.log(request)
    if (request.eventName === 'event') {
        sendMessage(request.eventName, request.data)
    }
}

function onWindowMessageListener(message) {
    //console.log(message)
    if (message.source != window) {
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
            default:
                break;
        }
    }
}

function initialize() {
    // Listen for background-script messages. This will only work for single events, as full journal is sent as a response below
    chrome.runtime.onMessage.addListener(onChromeMessageListener)
    // Listen for page-script messages
    window.addEventListener("message", onWindowMessageListener)
}

function reset() {
    chrome.runtime.onMessage.removeListener(onChromeMessageListener)
    window.removeEventListener("message", onWindowMessageListener)
}

// Tell background this script is ready, check if website is "toggled"
chrome.runtime.sendMessage({
    ready: true,
    hostname: window.location.hostname
})

// Listen for enable / disable events, independent from other events
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.eventName){
        case 'enabled':
            initialize()
            sendMessage(request.eventName)
            break
        case 'disabled':
            reset()
            sendMessage(request.eventName)
            break
        default: break
    }
});