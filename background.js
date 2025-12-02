// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  //  User clicked the floating button in contentscript.js
  if (request.action === "launch_inspector_from_tab") {
    handleLaunch(sender.tab).then(sendResponse);
    return true; // Keep channel open for async response
  }

  // The inspector.js tab asks for the stored session
  if (request.action === "getSession") {
    chrome.storage.local.get(['currentSession'], (result) => {
      sendResponse(result.currentSession || { error: "No session stored. Please click the 🕵️ button again." });
    });
    return true; // Keep channel open for async response
  }
});

async function handleLaunch(tab) {
  try {
    console.log("Inspector for tab::::", tab.url);
    const tabUrl = new URL(tab.url);
    const tabHost = tabUrl.hostname; 

    // Get ALL 'sid' cookies.
    // 'cookies.get({url})' often fails on Lightning domains, so we grab everything.
    const allCookies = await chrome.cookies.getAll({ name: "sid" });

    if (!allCookies || allCookies.length === 0) {
      console.error("No 'sid' cookie.");
      return;
    }

    let bestCookie = allCookies.find(c => {
      const cookieDomain = c.domain.startsWith('.') ? c.domain.substring(1) : c.domain;
      
      if (tabHost.includes(cookieDomain)) return true;

      const orgId = tabHost.split('.')[0]; 
      if (cookieDomain.includes(orgId) && cookieDomain.includes("salesforce.com")) return true;

      return false;
    });

    if (!bestCookie) {
      console.warn("No exact domain match, falling back to generic Salesforce cookie.");
      bestCookie = allCookies.find(c => c.domain.includes("salesforce.com"));
    }

    if (!bestCookie) {
      console.error("Could not find a valid Salesforce session.");
      return;
    }

    const cleanCookieDomain = bestCookie.domain.startsWith('.') ? bestCookie.domain.substring(1) : bestCookie.domain;
    const sessionData = {
      sessionId: bestCookie.value,
      apiUrl: "https://" + cleanCookieDomain
    };

    console.log("Session Found:", sessionData.apiUrl);

    //Save to Storage (Passes data to the new tab)
    await chrome.storage.local.set({ currentSession: sessionData });

    //Open the Inspector Tab
    chrome.tabs.create({ url: "inspector.html" });

  } catch (err) {
    console.error("Error 4handleLaunch:", err);
  }
}
