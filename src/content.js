// Configuration for privacy features
const privacyConfig = {
    // Common tracking scripts to block
    blockScripts: [
      'analytics',
      'tracking',
      'pixel',
      'metrics'
    ],
    // Remove tracking parameters from URLs
    trackingParams: [
      'ref_src',
      'ref_url',
      'twclid',
      's',
      't'
    ]
  };
  
  // Clean URLs by removing tracking parameters
  function cleanUrl(url) {
    try {
      const urlObj = new URL(url);
      privacyConfig.trackingParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      return urlObj.toString();
    } catch (e) {
      return url;
    }
  }
  
  // Block tracking scripts
  function blockTrackingScripts() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === 'SCRIPT') {
            const src = node.src.toLowerCase();
            if (privacyConfig.blockScripts.some(term => src.includes(term))) {
              node.remove();
            }
          }
        });
      });
    });
  
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
  
  // Remove tracking attributes from elements
  function removeTrackingAttributes() {
    const trackingAttributes = ['data-tracking', 'data-analytics', 'data-metrics'];
    
    const elements = document.querySelectorAll('*');
    elements.forEach(element => {
      trackingAttributes.forEach(attr => {
        if (element.hasAttribute(attr)) {
          element.removeAttribute(attr);
        }
      });
    });
  }
  
  // Initialize privacy features
  function initPrivacyFeatures() {
    // Clean current URL
    const cleanedUrl = cleanUrl(window.location.href);
    if (cleanedUrl !== window.location.href) {
      history.replaceState(null, '', cleanedUrl);
    }
  
    // Block tracking scripts
    blockTrackingScripts();
  
    // Remove tracking attributes
    removeTrackingAttributes();
  
    // Monitor link clicks
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href) {
        link.href = cleanUrl(link.href);
      }
    }, true);
  }
  
  async function removeServiceWorker() {
    console.log("NeuterX: removing service worker");
    if ("serviceWorker" in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          console.log("NeuterX: found", regs.length, "service workers");
          for (const reg of regs) {
            console.log("NeuterX: found service worker =>", reg.scope);
            // Only unregister if the SW scope includes x.com
            if (reg.scope.includes("https://x.com/")) {
              console.log("NeuterX: unregistering X service worker =>", reg.scope);
              await reg.unregister();
            }
          }
        } catch (err) {
          console.error("NeuterX: failed to unregister service worker", err);
        }
      }
  }

  function getIncomeLoss(requestsBlocked) {
    // Let's assume 3 CPM on the low end. 
    const val = requestsBlocked * 0.003;
    return val.toFixed(2);
  }

  function monkeyPatchServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    // Save the original register function.
    const originalRegister = navigator.serviceWorker.register;
  
    // Override register
    Object.defineProperty(navigator.serviceWorker, 'register', {
      value: async function swRegisterPatched(...args) {
        console.log("NeuterX: SW register called with:", args);
  
        // Call the original method
        const reg = await originalRegister.apply(this, args);
        
        // Here, 'reg' is a ServiceWorkerRegistration object
        // Hook into its lifecycle events:
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              console.log("NeuterX: SW state changed ->", installingWorker.state);
              // Could do something like:
              if (installingWorker.state === 'installed') {
                console.log("NeuterX: SW installed");
              } else if (installingWorker.state === 'activating') {
                console.log("NeuterX: SW activating");
              }
              // etc.
            };
          }
        };
  
        // Optionally track the controlling SW
        navigator.serviceWorker.oncontrollerchange = () => {
          console.log("NeuterX: Controller changed ->", navigator.serviceWorker.controller);
        };
  
        return reg;
      },
      configurable: true
    });
  }

  // Create privacy status popup
  function createPopup() {
    const popup = document.createElement('div');
    popup.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 20px;
      width: 250px;
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      z-index: 10000;
    `;
    
    popup.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: black;">DefundX</h3>
      <p style="margin: 0 0 15px 0;color: black;">
        ✓ Blocking ad impressions and analytics tracking<br>
        </p>
        <p id="attemptedRequests" style="color: red; font-size: 20px; font-weight: bold;"></p>
        <div style="display: flex; justify-content: space-between;">
        <button id="closePopup" style="
          padding: 5px 10px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
        ">Close</button>
      </div>
      <p style="color: black;">Follow me on <a href="https://twitter.com/anakinfighter" target="_blank">twitter</a> or <a href="https://thefightinganakin.bsky.social" target="_blank">bluesky</a></p>
      <p style="color: black;"><a href="https://bsky.app/" target="_blank">Bluesky</a> has gotten much better (including realtime trending topics!) so you should go there instead of twitter/X</p>
    `;
    console.log("document is", document);
    document.body.appendChild(popup);
    
    document.getElementById('closePopup').addEventListener('click', () => {
      popup.remove();
    });

    // Get the initial count from storage
    chrome.storage.sync.get('blockedRequestCount', (data) => {
      let blockedRequestCount = data.blockedRequestCount || 0;
      const attemptedRequestsElement = document.getElementById('attemptedRequests');
      attemptedRequestsElement.textContent = `$${getIncomeLoss(blockedRequestCount)} loss for X`;

      // Update the count when a new request is blocked
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'BLOCKED_REQUEST') {
          blockedRequestCount++;
          attemptedRequestsElement.textContent = `$${getIncomeLoss(blockedRequestCount)} loss for X`;
          chrome.storage.sync.set({ blockedRequestCount });
        }
      });
    });
  }

  function injectIFrame() { 
    console.log("[content.js] Injecting safe iframe...");

    // Construct the URL to safe_iframe.html inside the extension.
    const safeIframeUrl = chrome.runtime.getURL("iframe.html");
    
    // If you want to pass a specific URL to display in the "unsafe" iframe, you can:
    // let realUrl = "https://example.com/somePage";
    // safeIframeUrl += "?url=" + encodeURIComponent(realUrl);
  
    // Create the iframe in the page. 
    // (Here we size it in the bottom-right corner as an example.)
    const iframe = document.createElement("iframe");
    iframe.src = safeIframeUrl;
    iframe.style.position = "fixed";
    iframe.style.width = "400px";
    iframe.style.height = "300px";
    iframe.style.bottom = "0";
    iframe.style.right = "0";
    iframe.style.zIndex = 999999; // ensure it's on top
    iframe.style.border = "2px solid #ccc";
    iframe.style.background = "#fff";
    
    // Append it to the DOM
    document.body.appendChild(iframe);
  }
 
  // Initialize when page loads
  if (window.location.hostname.includes('x.com')) {
    monkeyPatchServiceWorker();
    removeServiceWorker();
    initPrivacyFeatures();
    createPopup();
  }

  // Save the initial count to storage when the extension is installed or updated
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ blockedRequestCount: 0 });
    chrome.storage.sync.set({ uuid: uuidv4() });
  });
