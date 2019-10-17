
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

function getFile(fileName, handler) {
    if (fileName !== null) {
        $.ajax({
            type: 'GET',
            url: fileName,
            success: function (res) {
                handler(res)
            },
            error: function () {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icon_disabled.png',
                    title: 'Elite Dangerous Web Connector',
                    message: 'Unable to fetch ' + fileName
                })
            }
        })
    }
}


function getStatus(handler) {
    $.ajax({
        type: 'GET',
        url: folder + '/Status.json',
        success: function (res) {
            handler(res)
        },
        error: function () {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon_disabled.png',
                title: 'Elite Dangerous Web Connector',
                message: 'Unable to load Status file'
            })
        }
    })
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
    })
    var lastRes = ''
    var t = this;
    updateInterval = setInterval(() => {
        getFile(journalFile, (res) => {
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

        getFile(folder + '/Status.json', (res) => {
            for (tab in followTabIds) {
                chrome.tabs.sendMessage(followTabIds[tab], {
                    eventName: 'status',
                    data: JSON.parse(res)
                })
            }
        })


        getFile(folder + '/ModulesInfo.json', (res) => {
            for (tab in followTabIds) {
                chrome.tabs.sendMessage(followTabIds[tab], {
                    eventName: 'modulesInfo',
                    data: JSON.parse(res)
                })
            }
        })

        getFile(folder + '/Cargo.json', (res) => {
            for (tab in followTabIds) {
                chrome.tabs.sendMessage(followTabIds[tab], {
                    eventName: 'cargo',
                    data: JSON.parse(res)
                })
            }
        })

        getFile(folder + '/Shipyard.json', (res) => {
            for (tab in followTabIds) {
                chrome.tabs.sendMessage(followTabIds[tab], {
                    eventName: 'shipyard',
                    data: JSON.parse(res)
                })
            }
        })

        getFile(folder + '/Outfitting.json', (res) => {
            for (tab in followTabIds) {
                chrome.tabs.sendMessage(followTabIds[tab], {
                    eventName: 'outfit',
                    data: JSON.parse(res)
                })
            }
        })

        getFile(folder + '/Market.json', (res) => {
            for (tab in followTabIds) {
                chrome.tabs.sendMessage(followTabIds[tab], {
                    eventName: 'market',
                    data: JSON.parse(res)
                })
            }
        })
        
    }, 1000);
}
initialize()

// Every minute, check if there is a new file and re-initialize
var check = setInterval(() => {
    findJournal((file) => {
        if (file !== journalFile) {
            clearInterval(updateInterval)
            initialize()
        }
    }, () => {
        clearInterval(check)
        clearInterval(updateInterval)
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon_disabled.png',
            title: 'Elite Dangerous Web Connector',
            message: 'Could not find a journal file ! Check your settings.'
        })
        setTimeout(() => {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon_disabled.png',
                title: 'Elite Dangerous Web Connector',
                message: 'Please fix the problem and reload the extension once fixed.'
            })
        }, 8000)
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
chrome.tabs.onUpdated.addListener(checkActiveTab)

chrome.tabs.onActivated.addListener(checkActiveTab)

chrome.tabs.onRemoved.addListener((tabId) => {
    followTabIds.remove(followTabIds.indexOf(tabId))
})

checkActiveTab()

// Todo EDDN contribution :o
// todo still duplication bug if switch tab