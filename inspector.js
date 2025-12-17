import { renderMergedTables } from './tableRender.js';
import { fetchPermissionData, fetchProfilesAndPermissions } from './getData.js';

const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
console.log('toggleSwitch:', toggleSwitch);

chrome.storage.local.get(['theme'], (result) => {
    const currentTheme = result.theme || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
        toggleSwitch.checked = true;
    }
});

function switchTheme(e) {
    console.log('switchTheme called');
    const newTheme = e.target.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    chrome.storage.local.set({ theme: newTheme }, () => {
        console.log('Theme on storage:', newTheme);
    });
}

toggleSwitch.addEventListener('change', switchTheme, false);

//table filter logic
setupFilter('profileSearch', 'profileTable');
setupFilter('psSearch', 'psTable');

function setupFilter(inputId, tableId) {
  document.getElementById(inputId).addEventListener('keyup', (e) => {
    const filter = e.target.value.toLowerCase();
    const rows = document.querySelectorAll(`#${tableId} tbody tr`);
    
    rows.forEach(row => {
      const nameCell = row.cells[0]; 
      if (nameCell) {
        const text = nameCell.textContent || nameCell.innerText;
        row.style.display = text.toLowerCase().indexOf(filter) > -1 ? "" : "none";
      }
    });
  });
}

// Global Cache
let allProfiles = [];
let allPermSets = [];

document.getElementById('btnSearch').addEventListener('click', async () => {
  const status = document.getElementById('status');
  const type = document.getElementById('metaType').value;
  const inputName = document.getElementById('apiName').value.trim();
  const resultsArea = document.getElementById('resultsArea');
  
  // Clear filters
  document.getElementById('profileSearch').value = '';
  document.getElementById('psSearch').value = '';

  if (!inputName) {
    status.innerText = "Please enter an API Name";
    return;
  }

  status.innerText = "Loading!";
  resultsArea.classList.add('hidden');

  // 1. Get Session
  const response = await chrome.runtime.sendMessage({ action: "getSession" });
  if (response.error || !response.sessionId) {
    status.innerText = "Error: " + (response.error || "No session found.");
    return;
  }
  const session = response;

  try {
    //get all ps and profiles
    if (allProfiles.length === 0) {
      status.innerText = "Fetching all Profiles & Permission Sets...";
      const lists = await fetchProfilesAndPermissions(session);
      allProfiles = lists.allProfiles;
      allPermSets = lists.allPermSets;
    }

    status.innerText = `Retrieving permission for ${inputName}...`;
    
    const data = await fetchPermissionData(session, type, inputName);
    
    const correctName = data.correctName;
    document.getElementById('apiName').value = correctName;
    
    const records = data.records;

    if (type === 'Flow' && data.flowActive) {
       status.innerHTML = `Flow <b>${correctName}</b> is ${data.flowActive.isActive ? 'Active' : 'Inactive'}. Scanning permissions...`;
    }
    const headers = (type === 'Object') 
      ? "<tr><th>Name</th><th>Read</th><th>Create</th><th>Edit</th><th>Delete</th><th>View All</th><th>Modify All</th></tr>"
      : "<tr><th>Name</th><th>Access</th></tr>";

    document.querySelector('#profileTable thead').innerHTML = headers;
    document.querySelector('#psTable thead').innerHTML = headers;

    //create table
    renderMergedTables(records, type, allProfiles, allPermSets, session);

    //Status Logic
    if (records.length === 0) {
      if (type === 'Flow') {
        status.innerHTML = `<b>${correctName}</b> exists, but NO explicit permissions found.<br>
                            <small>• If "Override Default Behavior" is <b>UNCHECKED</b>: Accessible to all "Run Flows" users.<br>
                            • If "Override Default Behavior" is <b>CHECKED</b>: No one has access.</small>`;
      } else {
        status.innerHTML = `<b>${correctName}</b> exists, but <b>NO ONE</b> has access even admin.`;
      }
    } else {
      status.innerText = `Permission found:`;
    }
    
    resultsArea.classList.remove('hidden');

  } catch (err) {
    status.innerText = err.message;
    console.error(err);
  }
});
