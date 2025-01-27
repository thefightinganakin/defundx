
chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
      if (details.url.includes("events") || details.url.includes("client_event") || details.url.includes("update_subscriptions")) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length > 0) {
              chrome.tabs.sendMessage(tabs[0].id, { type: 'BLOCKED_REQUEST' });
            }
        });
      }
    },
    {urls: ["<all_urls>"]},
    ["requestBody"]
  );