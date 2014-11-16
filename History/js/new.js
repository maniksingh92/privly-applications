/**
 * @fileOverview Manages the form interaction with remote servers.
 **/

/**
 * The callbacks assign the state of the application.
 *
 * This application can be placed into the following states:
 * 1. Pending Login Check: The app is currently requesting the CSRF
 *    token from the remote server. Callback=pendingLogin
 * 2. Failure to login: The user is not currently authenticated with the
 *    remote server. In this state the user is prompted to login.
 *    Callback=loginFailure
 * 3. Pending post: The user can make the post at this point.
 *    Callback=pendingPost
 * 4. Completed post: The remote server has returned a URL. This app should
 *    display it and fire the URL event.
 *    Callback=postCompleted
 */
var callbacks = {
  
  /**
   * Initialize the whole application.
   */
  pendingLogin: function() {

    // Save to local storage the app to redirect to after succesful log in
    ls.setItem("Login:redirect_to_app", window.location.href);
    
    // Set the nav bar to the proper domain
    privlyNetworkService.initializeNavigation();
    
    // Initialize message pathway to the extension.
    messaging.initialize();
    
    // Watch for the preview iframe's messages so it can be resized
    window.addEventListener('message', resizeIframePostedMessage, false);
    
    // Add listeners to show loading animation while making ajax requests
    $(document).ajaxStart(function() {
      $('#loadingDiv').show(); 
    });
    $(document).ajaxStop(function() { 
      $('#loadingDiv').hide(); 
    });
    
    privlyNetworkService.initPrivlyService(
      privlyNetworkService.contentServerDomain(),
      callbacks.pendingPost, 
      callbacks.loginFailure, 
      callbacks.loginFailure);
  },
  
  /**
   * Prompt the user to sign into their server. This assumes the remote
   * server's sign in endpoint is at "/users/sign_in".
   */
  loginFailure: function() {
    $("#messages").hide();
    $("#login_message").show();
    $("#refresh_link").click(function(){location.reload(true);});
    privlyNetworkService.showLoggedOutNav();
  },
  
  /**
   * Tell the user they can create their post by updating the UI.
   */
  pendingPost: function() {
    
    privlyNetworkService.showLoggedInNav();
    
    privlyNetworkService.sameOriginGetRequest(
      privlyNetworkService.contentServerDomain() + "/posts", 
      callbacks.postCompleted);
    $("#save").prop('disabled', false);
    $("#messages").toggle();
    $("#form").toggle();
  },
  
  /**
   * Parse the JSON date format and return the difference in time
   * @param {json} string Represents the date 
   * @param {bool} mode Sets if the date is in the past or in the future 
   */
  parseDate: function(string, mode) {

    var date = new Date(string);
    var current = new Date();

    var timeDiff;
    if (mode) {
      timeDiff = Math.abs(current.getTime() - date.getTime());
    } else {
      timeDiff = Math.abs(date.getTime() - current.getTime());
    }

    var minutes_raw = Math.floor(timeDiff / (1000 * 60));
    var hours_raw = Math.floor(timeDiff / (1000 * 3600));
    var days = Math.floor(timeDiff / (1000 * 3600 * 24));

    var hours = hours_raw - (days * 24);
    var minutes = minutes_raw - (hours_raw * 60);
    
    if(days > 1) {
      days = days + " days ";
    } else if(days > 0) {
      days = days + " day ";
    } else {
      days = "";
    }

    hours = hours > 0 ? hours + "h " : "";

    var end;
    if(minutes == 0 && hours == 0 && days == 0) {
      minutes = "";
      end = "Just now";
    } else {
      end = (mode ? "m ago" : "m from now");
    }
    
    return " " + days + hours + minutes + end;
  },

  /**
   * Display the table of posts stored at the server.
   */
  postCompleted: function(response) {
    
    var tableBody = document.getElementById("table_body");
    for(var i = 0; i < response.json.length; i++) {

      var app = response.json[i].privly_application;
      var href = response.json[i].privly_URL;

      // Assumes web and checks for other platforms
      var localHref = "/apps/";
      var platform = privlyNetworkService.platformName();
      if ( platform === "FIREFOX" ) {
        localHref = "/content/privly-applications/";
      } else if(platform == "CHROME") {
        localHref = "/privly-applications/";
      }
      localHref += app + "/show.html?privlyOriginalURL=" +
        encodeURIComponent(href);

      var tr = document.createElement('tr');
      
      var td1 = document.createElement('td');

      var td1b = document.createElement('button');
      td1b.setAttribute("type", "submit");
      td1b.setAttribute("class", "btn btn-default preview_link");
      td1b.setAttribute("data-canonical-href", localHref);
      td1b.textContent = "Preview " + app;
      td1b.style.width = "150px";
      td1b.style.height = "33px";
      td1.appendChild(td1b);

      var td1b2 = document.createElement('button');
      td1b2.setAttribute("type", "submit");
      td1b2.setAttribute("class", "btn btn-info open_link");
      td1b2.setAttribute("data-canonical-href", localHref);
      td1b2.textContent = "Open";
      td1b2.style.height = "33px";
      td1.appendChild(td1b2);

      tr.appendChild(td1);
      
      // For the next three columns hide the Json date format,
      // and create an <i> child in which the difference in time will be shown
      var td2 = document.createElement('td');
      td2.textContent = response.json[i].created_at;      
      td2.className += " myHide";
      var i1 = document.createElement('i');
      i1.textContent = callbacks.parseDate(response.json[i].created_at, true);
      td2.appendChild(i1);
      tr.appendChild(td2);
      
      var td3 = document.createElement('td');
      td3.textContent = response.json[i].burn_after_date;
      td3.className += " myHide";
      var i2 = document.createElement('i');
      i2.textContent = callbacks.parseDate(response.json[i].burn_after_date, false);
      td3.appendChild(i2);
      tr.appendChild(td3);
      
      var td4 = document.createElement('td');
      td4.textContent = response.json[i].updated_at;      
      td4.className += " myHide";
      var i3 = document.createElement('i');
      i3.textContent = callbacks.parseDate(response.json[i].updated_at, true);
      td4.appendChild(i3);
      tr.appendChild(td4);
      
      tableBody.appendChild(tr)
      
    }
    
    dataTable = $('#posts').dataTable({"bPaginate": false, "bFilter": false});

    // Add 'cell-border' class when the window has a width smaller than 768px
    $(window).resize(function() {
      if($(window).width() < 768) {
        $('#posts').addClass("cell-border");
      } else {
        $('#posts').removeClass("cell-border");
      }
    });
    
    $('button.preview_link').on('click', function(evt) {

      $('html, body').animate({ scrollTop: 0 }, 'slow');

      $('#iframe_col').show('slow', function() {
        $(this).css('display', 'inherit');
      });
      
      var iFrame = document.createElement('iframe');

      // Styling and display attributes that mirror those
      // of the privly.js content script
      iFrame.setAttribute("frameborder","0");
      iFrame.setAttribute("vspace","0");
      iFrame.setAttribute("hspace","0");
      iFrame.setAttribute("width","100%");
      iFrame.setAttribute("marginwidth","0");
      iFrame.setAttribute("marginheight","0");
      iFrame.setAttribute("height","1px");
      iFrame.setAttribute("frameborder","0");
      iFrame.setAttribute("style","width: 100%; height: 32px; " +
        "overflow: hidden;");
      iFrame.setAttribute("scrolling","no");
      iFrame.setAttribute("overflow","hidden");
      iFrame.setAttribute("data-privly-accept-resize","true");

      // The href of the original link as dictated by the remote server
      var canonicalHref = $(this).attr("data-canonical-href");
      iFrame.setAttribute("data-canonical-href", canonicalHref);

      //Set the source URL
      iFrame.setAttribute("src", canonicalHref);

      //The id and the name are the same so that the iframe can be
      //uniquely identified and resized by resizeIframePostedMessage()
      iFrame.setAttribute("id", "ifrm0");
      iFrame.setAttribute("name", "ifrm0");

      // Clear the old iframe and insert the new one
      $(".privly_iframe").empty();
      $(".privly_iframe").append(iFrame);
    });

    $('button.open_link').on('click', function() {
      window.open($(this).attr("data-canonical-href"), '_blank');
    });

    $('#destroy_link').on('click', function() {
      var url = privlyParameters.getApplicationUrl($("iframe").attr("data-canonical-href"));
      var dataURL =  privlyParameters.getParameterHash(url).privlyDataURL;
      privlyNetworkService.sameOriginDeleteRequest(
        dataURL,
        function(response) {
            if( response.jqXHR.status === 200 ) {
              var tr = $(this).closest('tr');
              tr.hide();
              $('#iframe_col').hide('slow');
            }
        }, {});
    });

    $('#hide_preview').on('click', function() {
    $('#iframe_col').hide('slow');
    });
  }
}

/**
 * Message handlers for integration with extension framworks.
 */
var messaging = {
  
  /**
   * Attach the message listeners to the interface between the extension
   * and the injectable application.
   */
  initialize: function() {
      privlyExtension.initialContent = messaging.initialContent;
      privlyExtension.messageSecret = messaging.messageSecret;
      
      // Initialize message pathway to the extension.
      privlyExtension.firePrivlyMessageSecretEvent();
  },
  
  
  /**
   * Listener for the initial content that should be dropped into the form.
   * This may be sent by a browser extension.
   *
   * @param {json} data A json document containing the initial content for
   * the form.
   */
  initialContent: function(data) {},

  /**
   * Request the initial content from the extension. This callback is executed
   * after the extension successfully messages the secret message back to the
   * application.
   * 
   * @param {json} data A json document that is ignored by this function.
   */
  messageSecret: function(data) {}
  
}

/**
 * Resize eligible iframes to the proper height based on their contents.
 *
 * @param {message} e The message posted by an iframe. 
 */
function resizeIframePostedMessage(e) {
  var messageComponents = e.data.split(",");
  if( e.origin !== window.location.origin ||
    messageComponents.length < 2 ||
    messageComponents[0] === ""
    ) {
    return;
  }
  var iframe = document.getElementById(messageComponents[0]);
  if(iframe !== null) {
    iframe.style.height = messageComponents[1] + "px";
  }
}

/**
 * Sends the currently displayed URL to the extension or mobile framework
 * running the applicaiton so it can be submitted to a host page webform.
 */
function postUrl() {
  privlyExtension.firePrivlyURLEvent(
    document.getElementById("ifrm0").getAttribute("data-canonical-href"));
}

// Initialize the application
document.addEventListener('DOMContentLoaded',
  function() {

    // Don't start the script if it is running in a Headless
    // browser
    if( document.getElementById("logout_link") )
      callbacks.pendingLogin();
  }
);
