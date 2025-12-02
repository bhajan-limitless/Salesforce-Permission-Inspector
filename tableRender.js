export function renderMergedTables(permissionRecords, type, allProfiles, allPermSets, session) {
  const profBody = document.querySelector('#profileTable tbody');
  const psBody = document.querySelector('#psTable tbody');
  profBody.innerHTML = ''; 
  psBody.innerHTML = '';

  const permMap = {};
  permissionRecords.forEach(r => {
    if (!r.Parent) return;
    let lookupName;
    if (r.Parent.IsOwnedByProfile) {
      lookupName = (r.Parent.Profile && r.Parent.Profile.Name) ? r.Parent.Profile.Name : r.Parent.Label;
    } else {
      lookupName = r.Parent.Label;
    }
    permMap[lookupName] = r;
  });

  renderSection(allProfiles, permMap, profBody, type, session);
  renderSection(allPermSets, permMap, psBody, type, session);
}

function renderSection(itemList, permMap, container, type, session) {
  itemList.forEach(item => {
    // FIX: Check if item is an object (has Name/Label) or just a string
    const lookupName = item.Name || item.Label; 
    
    const record = permMap[lookupName];
    const tr = document.createElement('tr');
    tr.innerHTML = buildRowHTML(item, record, type, session);
    container.appendChild(tr);
  });
}

function buildRowHTML(item, record, type, session) {
  const name = item.Name || item.Label;
  const id = item.Id; 
  
  const link = `<a href="${session.apiUrl}/${id}" target="_blank" style="color:#0070d2; text-decoration:none; font-weight:600;">${name}</a>`;

  if (!record) {
    if (type === 'Object') return `<td>${link}</td><td>False</td><td>False</td><td>False</td><td>False</td><td>False</td><td>False</td>`;
    
    let noAccessLabel = "No Access";
    if (type === 'Flow') noAccessLabel = "No Explicit Access";
    
    return `<td>${link}</td><td class="none" style="color:#c23934">${noAccessLabel}</td>`;
  }

  if (type === 'Field') {
    let access = "Read Only";
    let cssClass = "read"; 
    if (record.PermissionsEdit) { access = "Read/Edit"; cssClass = "edit"; }
    return `<td>${link}</td><td class="${cssClass}">${access}</td>`;
  } 
  else if (type === 'Object') {
    const check = (val) => val ? "True" : "False";
    return `<td>${link}</td>
            <td>${check(record.PermissionsRead)}</td>
            <td>${check(record.PermissionsCreate)}</td>
            <td>${check(record.PermissionsEdit)}</td>
            <td>${check(record.PermissionsDelete)}</td>
            <td>${check(record.PermissionsViewAllRecords)}</td>
            <td>${check(record.PermissionsModifyAllRecords)}</td>`;
  }
  else {
    return `<td>${link}</td><td style="color:green; font-weight:bold;">Enabled</td>`;
  }
}
