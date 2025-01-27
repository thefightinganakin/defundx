// popup.js
console.log("DefundX: popup script loaded");

// Function to calculate your "income loss" logic
function getIncomeLoss(blockedCount) {
  // Example math, adjust as needed
  return (blockedCount * 0.003).toFixed(2);
}

// Function to update the income loss display
function updateIncomeLoss() {
  console.log("DefundX: updating income loss");
  chrome.storage.sync.get('blockedRequestCount', (data) => {
    const blockedRequestCount = data.blockedRequestCount || 0;
    const incomeLossElement = document.getElementById('incomeLoss');
    incomeLossElement.textContent = `$${getIncomeLoss(blockedRequestCount)} loss for X`;
  });
}

// Update the income loss display initially
updateIncomeLoss();

// Listen for storage changes and update the income loss display
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.blockedRequestCount) {
    updateIncomeLoss();
  }
});