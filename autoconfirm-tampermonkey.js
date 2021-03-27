// ==UserScript==
// @name         YouTube Activity Check Autoclick
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Automatically trigger click events on Youtube's Activity Check Confirmation popups
// @author       taylorj999
// @include      https://youtube.com/*
// @include      https://*.youtube.com/*
// @grant        none
// @require      https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js
// ==/UserScript==

var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

// Toggle the numerous debugging statements on or off
var debugYoutubeMode = false;

// Array of attributes to react to; this should be kept as short as possible to reduce overhead
// Currently: aria-hidden is changed whenever a popup dialog is made visible
// (For future reference, in case of changes to the Youtube dialogs, "prevent-autonav" is another one that is changed when the interrupt becomes active)
const attributesToWatch = ["aria-hidden"];

// Match two potential scenarios:
// * "Video Paused: Continue watching?" "YES"
// * "Upgrade to Premium to watch interrupted" "NO THANKS"
// Button text in other languages can be added to the array here
const buttonsToClick = ["YES","NO THANKS"];

// Youtube began changing the names of their 'paper dialogs' for some reason
const paperDialogTagname = "TP-YT-PAPER-DIALOG"; // was originally just "PAPER-DIALOG"
const paperToastTagname = "TP-YT-PAPER-TOAST"; // was originally just "PAPER-TOAST"

// Because of the constant mutations of the DOM, a delay is needed to avoid repeatedly hammering the click action
const minimumTimeBetweenActions = 1000;
var lastActionTime = new Date().getTime() - minimumTimeBetweenActions;

function hasEnoughTimePassed() {
    let currTime = new Date().getTime();
    if (currTime - lastActionTime >= minimumTimeBetweenActions) {
        return true;
    }
    return false;
}

// Convenience function for generating a timestamp - used for the debugging statements
function twoDigits(n){
    return n > 9 ? "" + n: "0" + n;
}

function generateSimpleTimestamp() {
    let dateTime = new Date();
    return dateTime.getHours() + ":" + twoDigits(dateTime.getMinutes()) + ":" + twoDigits(dateTime.getSeconds());
}

// Given a Node element in the DOM, uses the jQuery trigger event to fake a click on it
// delayUntilClick should be set long enough for the popup dialog to be fully loaded
const delayUntilClick = 100;

function triggerClick(node) {
    try {
        if (debugYoutubeMode) console.log(generateSimpleTimestamp() + " Executing a click action - Node name is: " + node.nodeName);
        let evt = jQuery.Event( "click" );
        jQuery(node).trigger(evt);
    } catch (e) {
        console.log(e);
    }
}

function delayedTriggerClick(node) {
    setTimeout(triggerClick(node),delayUntilClick);
}

// Convenience function for tag name checking. The tag names used within the Youtube HTML can vary wildly in terms of upper/lower case
// so this function always converts both to upper case before comparing.
function matchesTagName(tagName1, tagName2) {
    if (tagName1.toUpperCase() === tagName2.toUpperCase()) {
        return true;
    } else {
        return false;
    }
}

// Convenience function for checking if a tag has a given class name in its list
function containsClassName(className1, className2) {
    if (className1.includes(className2)) {
        return true;
    } else {
        return false;
    }
}

// The innerText field contains all text within a DOM element and its children
// Given an innerText value, search for strings within it. Since case can vary wildly within the Youtube HTML, convert it all to upper case before
// running the comparisons.
function innerTextMatches(innerText,arrayOfButtonNames) {
    let hasMatchedText = false;
    for (let x=0;x<arrayOfButtonNames.length;x++) {
        if (innerText.toUpperCase().includes(arrayOfButtonNames[x].toUpperCase())) {
            hasMatchedText = true;
            break;
        }
    }
    return hasMatchedText;
}

function dumpMutationInfo(mutation) {
    let debugMutation = {};
    debugMutation.innerText = mutation.target.innerText;
    debugMutation.innerHTML = mutation.target.innerHTML;
    debugMutation.tagName = mutation.target.tagName;
    debugMutation.className = mutation.target.className;
    debugMutation.attributeName = mutation.attributeName;
    debugMutation.mutation = mutation;
    console.log(generateSimpleTimestamp() +  " Mutation debug output");
    console.log(debugMutation);
}

// This function deals with the new (as of 8/28/2020) "Get the best YouTube Experience" interruptor
// It is broken out into a seperate function because we also need to call it on page load
function autoclickBestYoutubeExperience(nodeToCheck) {
    let subReasonNodes = nodeToCheck.querySelectorAll("div#reason");
    let bestFound = false;
    for (let y=0;y<subReasonNodes.length;y++) {
        if (subReasonNodes[y].innerText === "Get the best YouTube experience") {
            bestFound = true;
        }
    }
    if (bestFound) {
        if (debugYoutubeMode) {
            console.log(generateSimpleTimestamp() + " Found a match on 'Get the best YouTube experience'");
        }
        let subYtNodes = nodeToCheck.querySelectorAll("paper-button");
        if (debugYoutubeMode) {
            console.log(subYtNodes);
        }
        for (let z=0;z<subYtNodes.length;z++) {
            if (subYtNodes[z].ariaLabel === "Not Now") {
                if (debugYoutubeMode) { console.log(generateSimpleTimestamp() + " Found a matching 'Not Now' button"); }
                triggerClick(subYtNodes[z]);
                return true;
            }
        }
    }
}


// The main mutation handler function that gets attached to the MutationObserver
function handleMutation(mutations,observer) {
    if (!hasEnoughTimePassed()) {
        if (debugYoutubeMode) console.log(generateSimpleTimestamp() + " Received mutations but not enough time has passed since the last click action");
        return;
    }
    // The MutationObserver can report multiple mutations for the same element in the same array, however once a click action is triggered there is
    // no need to continue processing the current set of mutations
    mutationcheck: for (let j=0;j<mutations.length;j++) {
        if (matchesTagName(mutations[j].target.tagName,paperDialogTagname) || matchesTagName(mutations[j].target.tagName,paperToastTagname)) {
            // When youtube inevitably changes their dialogs up, debug output will make it infinitely easier to track down what was altered
            if (debugYoutubeMode) {
                dumpMutationInfo(mutations[j]);
            }
            // this is the match criteria for the two-dialog popup window
            // even though often only "YES" shows, there are two dialog options
            if (matchesTagName(mutations[j].target.tagName,paperDialogTagname) && containsClassName(mutations[j].target.className,"ytd-popup-container")
                && (mutations[j].attributeName === "aria-hidden")) {
                let ytDialogButtons = mutations[j].target.querySelectorAll("YT-BUTTON-RENDERER");
                if (debugYoutubeMode && ytDialogButtons.length>0) {
                    console.log(generateSimpleTimestamp() + " Found buttons:");
                    console.log(ytDialogButtons);
                }
                for (let k=0;k<ytDialogButtons.length;k++) {
                    if (innerTextMatches(ytDialogButtons[k].innerText,buttonsToClick)) {
                        if (debugYoutubeMode) console.log(generateSimpleTimestamp() + " Matched a button we want to click: " + ytDialogButtons[k].innerText);
                        delayedTriggerClick(ytDialogButtons[k]);
                        lastActionTime = new Date().getTime();
                        break mutationcheck;
                    } else {
                        if (debugYoutubeMode) console.log(generateSimpleTimestamp() + " Found a button that wasn't the one we wanted: " + ytDialogButtons[k].innerText);
                    }
                }
            }
            // This matches a "warning - video is about to pause" dialog
            // There is not a long enough window to react to this notification to allow a long delay of the triggered click
            // or to reset the activity lockout; so for this one the click is triggered immediately and in case we did not fire
            // it fast enough we do not reset the lockout timer so that the mutation handler can also fire for the main dialog
            // becoming visible
            if (matchesTagName(mutations[j].target.tagName,paperToastTagname) && containsClassName(mutations[j].target.className,"yt-notification-action-renderer")
                && (mutations[j].attributeName === "aria-hidden")) {
                if (innerTextMatches(mutations[j].target.innerText,["Still watching? Video will pause soon"])) {
                    if (debugYoutubeMode) {
                        console.log(generateSimpleTimestamp() + " Activity warning detected!");
                        console.log(mutations[j]);
                    }
                    let ytToastButtons = mutations[j].target.querySelectorAll("YT-BUTTON-RENDERER");
                    if (debugYoutubeMode) {
                        console.log(generateSimpleTimestamp() + " Found buttons:");
                        console.log(ytToastButtons);
                    }
                    for (let l=0;l<ytToastButtons.length;l++) {
                        if (innerTextMatches(ytToastButtons[l].innerText,buttonsToClick)) {
                            if (debugYoutubeMode) console.log(generateSimpleTimestamp() + " Matched a button we want to click: " + ytToastButtons[l].innerText);
                            triggerClick(ytToastButtons[l]);
                            break mutationcheck;
                        } else {
                            if (debugYoutubeMode) console.log(generateSimpleTimestamp() + " Found a button that wasn't the one we wanted: " + ytToastButtons[l].innerText);
                        }
                    }

                } else {
                    if (debugYoutubeMode) {
                        console.log(generateSimpleTimestamp() + " Found a toast we weren't expecting");
                        console.log(mutations[j]);
                    }
                }
            }
        // This matches the new "Get the best Youtube experience" interruption
        } else if (matchesTagName(mutations[j].target.tagName,"div") && containsClassName(mutations[j].target.className,"yt-player-error-message-renderer")) {
            if (debugYoutubeMode) {
                console.log(generateSimpleTimestamp() + " Found a video interruption");
                dumpMutationInfo(mutations[j]);
            }
            autoclickBestYoutubeExperience(mutations[j].target);
        // For debug purposes, output any other mutations we didn't match on
        } else {
            if (debugYoutubeMode) {
                console.log(generateSimpleTimestamp() + " In the final debug block");
                dumpMutationInfo(mutations[j]);
            }
        }
    }
}

// Unfortunately the "Shady DOM" makes it extremely unreliable to use document.querySelectorAll to get the paper-dialog nodes, forcing us to watch
// the entire document and filter results in the handler function
var observer = new MutationObserver(handleMutation);
observer.observe(document, {
    subtree: true,
    attributes: true,
    attributeFilter: attributesToWatch
});

let delayBetweenChecks = 1000;
var currentYoutubeUrl = null;
// Check for the "Get the best YouTube experience" interruption on startup
// Delayed x ms to allow the interrupt to be rendered in the first place
setInterval(function() {
    if (location.href != currentYoutubeUrl) {
        if (debugYoutubeMode) { console.log(generateSimpleTimestamp() + " URL changed"); }
        let bestYoutubeExperience = document.querySelectorAll("div.yt-player-error-message-renderer");
        if (debugYoutubeMode) {
            console.log(generateSimpleTimestamp() + " Found a potential interrupt dialog");
        }
        for (let x=0;x<bestYoutubeExperience.length;x++) {
            if (autoclickBestYoutubeExperience(bestYoutubeExperience[x])) {
                currentYoutubeUrl = location.href; // don't stop checking after a page url change until we find the dialog box
                break;
            }
        }
    }
},delayBetweenChecks);
