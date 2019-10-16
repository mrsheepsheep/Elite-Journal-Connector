
const folder = "C:/Users/MrSheepSheep/Saved Games/Frontier Developments/Elite Dangerous"
var fulljournal = null;
var journalFile = null
var updateInterval = null
var enabledWebsites = []
var followTabIds = []

function findJournal(success, error) {
    // Get all files
    $.ajax({
        type: 'GET',
        url: folder,
        success: function(res) {
            chrome.storage.local.set({fileurl: true});
            res = res.split('addRow("')
            let journalFileName = null
            // Find current journal file           
            for (var index = res.length - 1; index > 0; index--){
                let line = res[index]
                fileName = line.split('"')[0]

                if (fileName.includes("Journal.") && fileName.includes("01.log")) {
                    journalFileName = fileName
                    break;
                }
            }
            if (journalFileName !== null){
                success(folder + '/' + journalFileName)
            } else {
                error()
            }
        },
        error
    })
}

function getJournal(journalFile, handler){
    if (journalFile !== null){
        $.ajax({
            type: 'GET',
            url: journalFile,
            success: function(res) {
                handler(res)
            },
            error: function(){
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icon_disabled.png',
                    title: 'Elite Dangerous Web Connector',
                    message: 'Unable to load journal file located at ' + journalFile
                })
            }
        })
    }
}


function initialize(){
    findJournal((file) => {
        journalFile = file 
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'Elite Dangerous Web Connector',
            message: 'New journal file found. ' + journalFile.split('/').reverse()[0]
        })
    }, () => {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon_disabled.png',
            title: 'Elite Dangerous Web Connector',
            message: 'Could not find a journal file ! Check your settings.'
        })
    })
    var lastRes = ''
    var t = this;
    updateInterval = setInterval(() => {
        getJournal(journalFile, (res) => {
            fulljournal = res.split('\n')
            fulljournal.pop()
            fulljournal = fulljournal.map(e => JSON.parse(e))
            if (res !== t.lastRes){
                var differenceJSON = res.replace(t.lastRes, '').split('\n')
                differenceJSON.pop()
                differenceJSON = differenceJSON.map(e => JSON.parse(e))
                t.lastRes = res;
                for (tab in followTabIds){
                    for (id in differenceJSON) {
                        console.log(differenceJSON[id].event)
                        chrome.tabs.sendMessage(followTabIds[tab], {
                            eventName: 'event',
                            data: differenceJSON[id]
                        })
                    }
                }
            }
        })
    }, 1000);
}
initialize()

// Every minute, check if there is a new file and re-initialize
setInterval(() => {
    findJournal((file) => {
        if (file !== journalFile) {
            clearInterval(updateInterval)
            initialize()
        }
    })
}, 1 * 1000)

// Wait for getJournal command from content script (requested by page script)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.ready) {
        if (!followTabIds.includes(sender.tab.id))
            followTabIds.push(sender.tab.id)
        // Check if website is toggled or not
        if (enabledWebsites.includes(request.hostname)) {
            chrome.tabs.sendMessage(sender.tab.id, {
                eventName: 'enabled'
            })
        }
    }
    else if (request.getJournal) {
        sendResponse({
            journal: fulljournal
        })
    }
})

chrome.storage.local.get(['enabled_websites'], (result) => {
    if (!result['enabled_websites']){
        chrome.storage.local.set({
            'enabled_websites': []
        })
    } else {
        enabledWebsites = result['enabled_websites']
    }
})

chrome.browserAction.onClicked.addListener((tab) => {
    const hostname = new URL(tab.url).hostname
    chrome.storage.local.get(['enabled_websites'], (result) => {
        if (enabledWebsites.includes(hostname)) {
            enabledWebsites.splice(enabledWebsites.indexOf(hostname), 1)
            console.log('Disabling', hostname)
        } else {
            enabledWebsites.push(hostname)
            console.log('Enabling', hostname)
        }

        chrome.storage.local.set({
            'enabled_websites': enabledWebsites
        })

        chrome.tabs.sendMessage(tab.id, {
            eventName: enabledWebsites.includes(hostname) ? 'enabled' : 'disabled',
            data: null
        })
        checkActiveTab()
    })
});

function checkActiveTab() {
    chrome.tabs.getSelected(null, (tab) => {
        const hostname = new URL(tab.url).hostname
        chrome.browserAction.setIcon({
            path: {
                "96": enabledWebsites.includes(hostname) ? "icon.png" : "icon_disabled.png"
            }
        })
    })
}
// Detect tab change
chrome.tabs.onActivated.addListener(() => {
    checkActiveTab()
})

chrome.tabs.onRemoved.addListener((tabId) => {
    followTabIds.remove(followTabIds.indexOf(tabId))
})

checkActiveTab()

// Todo EDDN contribution :o