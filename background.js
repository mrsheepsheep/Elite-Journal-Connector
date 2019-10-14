
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
                for (index in demandingTabs) {
                    for (id in differenceJSON) {
                        console.log('Sending', differenceJSON[id])
                        chrome.tabs.sendMessage(demandingTabs[index], {
                            event: "journal",
                            data: differenceJSON[id]
                        });
                    }
                }
            }
            
            t.lastRes = res;
        })
    }, 1000);
})


// Button Action handler
const demandingTabs = []
chrome.browserAction.onClicked.addListener((tab) => {
    demandingTabs.push(tab.id)
    chrome.tabs.executeScript(tab.id, {
        file: "/content.js"
    })
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    sendResponse({
        fulljournal
    })
})