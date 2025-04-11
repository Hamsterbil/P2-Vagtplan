// Function to load an HTML file and insert it into a target element
function loadHTML(file, targetId) {
    fetch(file)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load ${file}: ${response.statusText}`);
        }
        return response.text();
      })
      .then(data => {
        document.getElementById(targetId).innerHTML = data;
      })
      .catch(error => console.error(error));
  }
  
  // Load header.html into the #header div
  loadHTML('html/includes/header.html', 'header');
  
  // Load footer.html into the #footer div
  loadHTML('html/includes/footer.html', 'footer');