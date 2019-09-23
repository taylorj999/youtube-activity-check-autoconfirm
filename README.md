# Youtube "Activity Check" Autoconfirm

An addon script that automatically confirms the Youtube "Video paused. Continue watching?" dialogs and their variants.

Implemented as a [TamperMonkey](https://tampermonkey.net/) script. Installation of the Tampermonkey userscript manager is required.

---

## Installation

1. Install [Tampermonkey](https://tampermonkey.net/)
1. Open the autoconfirm-tampermonkey.js script in this repository. Click the _Raw_ button at the top of the file to view its source.
1. Copy the source code.
1. From the Tampermonkey icon in the browser toolbar, select "Create a new script..." _or_ from inside the Tampermonkey control panel in your browser click the Add Script tab (icon with a plus symbol).
1. Paste the source into the script window (overwriting the empty script there) and click save or hit Ctrl-S.
1. The script will take effect the next time you open a youtube.com window.

---

## How it works

Recently Youtube (for reasons presumably to do with bots) has implemented an activity check on their site. A dialog window appears with "Video paused. Continue watching?" and freezes the current video playback. This interrupts playlists and is generally annoying for all concerned.

Youtube does not make it easy to inspect the code of their site. Youtube's site is built around the Polymer engine, which encapsulates part of the HTML DOM into a "Shady DOM" (as distinct from the other implementation of hidden DOM called the "Shadow DOM/Shadow Root"). This makes normal methods of finding and tracking nodes such as document.querySelectorAll() inconsistent, since the _entire purpose_ of the "Shady DOM" is to encapsulate chunks of the DOM away from standard code.

There is, however, a method that the "Shady DOM" cannot hide from: the [MutationObserver API](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver), which fires events when the page DOM is changed. Using a MutationObserver, this addon watches for the dialog boxes to be made visible, finds the button that will confirm the dialog, and then uses the [jQuery.trigger()](https://api.jquery.com/trigger/) event simulator to simulate a mouse click on the button.

---

## Foreign Language Support

This script does not include foreign language support by default, however, the _buttonsToClick_ constant in the script can be modified with the button translations in your language.

---

## LICENSE

GNU General Public License v3.0
