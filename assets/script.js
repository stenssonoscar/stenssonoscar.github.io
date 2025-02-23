// Function to calculate employment duration dynamically
function calculateEmploymentDuration(startYear, startMonth, endYear = null, endMonth = null) {
    let startDate = new Date(startYear, startMonth - 1);
    let endDate = endYear ? new Date(endYear, endMonth - 1) : new Date();
  
    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();
    if (months < 0) {
      years -= 1;
      months += 12;
    }
  
    return `${years} yr${years !== 1 ? 's' : ''} ${months} mo${months !== 1 ? 's' : ''}`;
  }
  
  // Update durations on page load
  document.addEventListener("DOMContentLoaded", function () {
    let cgiElement = document.getElementById("cgi-duration");
    let sogetiElement = document.getElementById("sogeti-duration");
  
    if (cgiElement) cgiElement.innerText = calculateEmploymentDuration(2024, 11);
    if (sogetiElement) sogetiElement.innerText = calculateEmploymentDuration(2022, 11, 2024, 11);
  });
  