/**
 * @fileOverview first_run.js shows the necessary navigation and
 * design elements to be integrated into the privly-applications
 * bundle.
 */

/**
 * Initialize the applications by showing and hiding the proper
 * elements.
 */
function init() {
  // Set the nav bar to the proper domain
  privlyNetworkService.initializeNavigation();
  $("#messages").hide();
  $("#form").show();
  privlyTooltip.tooltip();
  privlyNetworkService.showLoggedInNav();
  
  // Show a preview of the tooltip to the user
  privlyTooltip.tooltip();
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init);