export async function fetchPermissionData(session, type, apiName) {
  const correctName = await validateInputData(session, type, apiName);
  
  let records = [];
  let flowActive = null; 

   if (type === 'Field') {
    const q = `SELECT Id, ParentId, Parent.IsOwnedByProfile, Parent.Label, Parent.Profile.Name, PermissionsRead, PermissionsEdit 
               FROM FieldPermissions WHERE Field = '${correctName}'`;
    const res = await runQuery(session, q);
    records = res.records;
  } 
  else if (type === 'Object') {
    const q = `SELECT Id, ParentId, Parent.IsOwnedByProfile, Parent.Label, Parent.Profile.Name, PermissionsRead, PermissionsCreate, PermissionsEdit, PermissionsDelete, PermissionsViewAllRecords, PermissionsModifyAllRecords 
               FROM ObjectPermissions WHERE SobjectType = '${correctName}'`;
    const res = await runQuery(session, q);
    records = res.records;
  }
  else if (type === 'ApexClass' || type === 'ApexPage') {
    const table = type === 'ApexClass' ? 'ApexClass' : 'ApexPage';
    const idRes = await runQuery(session, `SELECT Id FROM ${table} WHERE Name = '${correctName}'`);
    const entityId = idRes.records[0].Id;

    const q = `SELECT Id, ParentId, Parent.IsOwnedByProfile, Parent.Label, Parent.Profile.Name 
               FROM SetupEntityAccess WHERE SetupEntityId = '${entityId}'`;
    const res = await runQuery(session, q);
    records = res.records;
  }
  else if (type === 'Flow') {
    // We need ID and Active Status
    const idRes = await runQuery(session, `SELECT DurableId, Label, IsActive FROM FlowDefinitionView WHERE ApiName = '${correctName}'`);
    const flowId = idRes.records[0].DurableId;
    flowActive = { isActive: idRes.records[0].IsActive };

    const q = `SELECT Id, ParentId, Parent.IsOwnedByProfile, Parent.Label, Parent.Profile.Name 
               FROM SetupEntityAccess WHERE SetupEntityId = '${flowId}'`;
    const res = await runQuery(session, q);
    records = res.records;
  }

  return {
    correctName,
    records,
    flowActive
  };
}

export async function validateInputData(session, type, apiName) {
  apiName = apiName.trim();
  
  if (type === 'Object') {
    const q = `SELECT QualifiedApiName FROM EntityDefinition WHERE QualifiedApiName = '${apiName}' LIMIT 1`;
    const res = await runQuery(session, q);
    if (res.records.length > 0) return res.records[0].QualifiedApiName;
    throw new Error(`Object '${apiName}' does not exist.`);
  } 
  else if (type === 'Field') {
    const parts = apiName.split('.');
    if (parts.length !== 2) throw new Error("Invalid format. Use Object.Field");
    const objName = parts[0];
    const fieldName = parts[1].toLowerCase();

    const objQ = `SELECT Id, QualifiedApiName FROM EntityDefinition WHERE QualifiedApiName = '${objName}' LIMIT 1`;
    const objRes = await runQuery(session, objQ);
    if (!objRes.records.length) throw new Error(`Object '${objName}' not found.`);
    const officialObj = objRes.records[0].QualifiedApiName;

    const fieldQ = `SELECT Id, QualifiedApiName FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = '${officialObj}'`;
    const fieldRes = await runQuery(session, fieldQ);
    const match = fieldRes.records.find(r => r.QualifiedApiName.toLowerCase() === fieldName);
    
    if (!match) throw new Error(`Field '${fieldName}' not found on '${officialObj}'.`);
    return `${officialObj}.${match.QualifiedApiName}`;
  }
  else if (type === 'ApexClass' || type === 'ApexPage') {
    const mdtType = type === 'ApexClass' ? 'ApexClass' : 'ApexPage';
    const q = `SELECT Id, Name FROM ${mdtType} WHERE Name = '${apiName}' LIMIT 1`;
    const res = await runQuery(session, q);
    if (res.records.length > 0) return res.records[0].Name;
    throw new Error(`${type} '${apiName}' not found.`);
  }
  else if (type === 'Flow') {
    const q = `SELECT Id, ApiName FROM FlowDefinitionView WHERE ApiName = '${apiName}' LIMIT 1`;
    const res = await runQuery(session, q);
    if (res.records.length > 0) return res.records[0].ApiName;
    throw new Error(`Flow '${apiName}' not found.`);
  }
}

export async function runQuery(session, query) {
  let allRecords = [];
  let nextUrl = `${session.apiUrl}/services/data/v60.0/query?q=${encodeURIComponent(query)}`;
  
  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { "Authorization": "Bearer " + session.sessionId, "Content-Type": "application/json" }
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json[0]?.message || "API Error");

    if (json.records) allRecords = allRecords.concat(json.records);
    nextUrl = json.nextRecordsUrl ? session.apiUrl + json.nextRecordsUrl : null;
  }
  return { records: allRecords };
}

export async function fetchProfilesAndPermissions(session) {
  const profRes = await runQuery(session, "SELECT Id, Name FROM Profile ORDER BY Name");
  const allProfiles = profRes.records;

  const psRes = await runQuery(session, "SELECT Id, Label FROM PermissionSet WHERE IsOwnedByProfile = false ORDER BY Label");
  const allPermSets = psRes.records;
  
  return { allProfiles, allPermSets };
}
