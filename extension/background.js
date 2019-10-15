
const folder = "C:/Users/MrSheepSheep/Saved Games/Frontier Developments/Elite Dangerous"

function findJournal(success) {
    // Get all files
    $.ajax({
        type: 'GET',
        url: folder,
        success: function(res) {
            chrome.storage.local.set({fileurl: true});
            res = res.split('addRow("')

            // Find current journal file
            let journalFileName = null;
            
            for (var index = res.length - 1; index > 0; index--){
                let line = res[index]
                fileName = line.split('"')[0]

                if (fileName.includes("Journal.") && fileName.includes("01.log")) {
                   journalFileName = fileName
                    break;
                }
            }
            success(folder + "/" + journalFileName)
        }
    })
}

function getJournal(journalFile, handler){
    $.ajax({
        type: 'GET',
        url: journalFile,
        success: function(res) {
            handler(res)
        }
    })
}

var fulljournal = null;

findJournal((journalFile) => {
    setInterval(function(){
        var lastRes = '';
        var t = this;
        getJournal(journalFile, function(res) {
            fulljournal = res.split('\n')
            fulljournal.pop()
            fulljournal = fulljournal.map(e => JSON.parse(e))
            if (res !== t.lastRes){
                var differenceJSON = res.replace(t.lastRes, '').split('\n')
                differenceJSON.pop()
                differenceJSON = differenceJSON.map(e => JSON.parse(e))
                // Todo identify unique tab

                 for (id in differenceJSON) {
                    chrome.runtime.sendMessage({
                        eventName: 'event',
                        data: differenceJSON[id]
                    })
                }
                /*
                for (index in demandingTabs) {
                    for (id in differenceJSON) {
                        console.log('Sending', differenceJSON[id])
                        chrome.tabs.sendMessage(demandingTabs[index], {
                            eventName: "event",
                            data: differenceJSON[id]
                        });
                    }
                }
                */
            }
            t.lastRes = res;
        })
    }, 1000);
})

// Wait for getJournal command from content script (requested by page script)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request)
    if (request.ready) {
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
    return true
})

// Button Action handler
// Todo better tab handling, automatic load, trusted sources via option panel !
// Checkbox for every site, or just enable/disable on click

var enabledWebsites = []
// Check existing trusted websites

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

checkActiveTab()

// Todo EDDN contribution :o