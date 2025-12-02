(function() {
  // Prevent duplicate buttons if the script runs twice
  if (document.getElementById('sf-inspector-trigger')) return;

  const floatBtn = document.createElement('div');
  floatBtn.id = "sf-inspector-trigger";
  floatBtn.innerText = "🕵️";
  
  // Add styles
  Object.assign(floatBtn.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "50px",
    height: "50px",
    backgroundColor: "#446888ff",
    color: "white",
    borderRadius: "50%",
    textAlign: "center",
    lineHeight: "50px",
    fontSize: "24px",
    cursor: "pointer",
    zIndex: "999999",
    transition: "transform 0.2s"
  });

  floatBtn.onmouseover = () => floatBtn.style.transform = "scale(1.1)";
  floatBtn.onmouseout = () => floatBtn.style.transform = "scale(1)";

  floatBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "launch_inspector_from_tab" });
  });

  document.body.appendChild(floatBtn);
})();
