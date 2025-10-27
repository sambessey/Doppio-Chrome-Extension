<script>
  import { interactionCanvas } from "../content/interaction-helpers";

  // Centralized selector configuration
  // Update these when Google Slides changes their DOM structure
  const SELECTORS = {
    PRESENTATION_IFRAME: {
      primary: "punch-present-iframe",
      fallbacks: ["punch-viewer-iframe", "presentation-iframe"],
    },
    FULLSCREEN_OVERLAY: {
      primary: "punch-full-screen-element punch-full-window-overlay",
      fallbacks: ["punch-fullscreen", "full-screen-overlay"],
    },
    // Last verified: 2025-10-20
  };

  let currentSlideId = window.location.href.split("slide=id.")[1];
  let presentingState = false;
  let intervalId = 0;
  let interactiveDOM;
  let pendingInjections = new Set(); // Track slides waiting for injection
  let eventCode = "0";

  function getCurrentSlideId() {
    console.log("GETTING SLIDE ID");
    const hash = window.location.hash;
    const slideIdMatch = hash.match(/#slide=id\.(.+)/);
    return slideIdMatch;
  }

  function getSlidesId() {
    return window.location.pathname.split("/")[3];
  }

  function clearObserverInterval(i) {
    console.log("CLEARING INTERVAL", i);
    clearInterval(i);
  }

  /**
   * Finds an element using multiple selector strategies
   * @param {Object} selectorConfig - Config with primary and fallback selectors
   * @param {Document} doc - Document to search in (default: document)
   * @returns {Element|null} - Found element or null
   */
  function findElementWithFallback(selectorConfig, doc = document) {
    const selectors = [
      selectorConfig.primary,
      ...(selectorConfig.fallbacks || []),
    ];

    for (const selector of selectors) {
      const element = doc.getElementsByClassName(selector)[0];
      if (element) {
        if (selector !== selectorConfig.primary) {
          console.warn(`Using fallback selector: ${selector}`);
        }
        return element;
      }
    }

    console.error("All selector strategies failed:", selectors);
    return null;
  }

  function waitForElement(selectorConfig, timeout = 6000) {
    return new Promise((resolve, reject) => {
      const interval = 2000;
      let elapsedTime = 0;

      const checkElement = () => {
        interactiveDOM = findElementWithFallback(selectorConfig);
        if (interactiveDOM && interactiveDOM.contentDocument.body?.firstChild) {
          resolve(interactiveDOM);
        } else if (elapsedTime >= timeout) {
          reject(new Error("Element not found within timeout"));
        } else {
          elapsedTime += interval;
          setTimeout(checkElement, interval);
        }
      };

      checkElement();
    });
  }

  function findCanvasInSlide(currentSlide, isFirstSlide) {
    // Check if already injecting for this slide
    if (pendingInjections.has(currentSlide)) {
      console.log("Injection already pending for", currentSlide);
      return;
    }

    waitForElement(SELECTORS.PRESENTATION_IFRAME)
      .then((element) => {
        let targetElement = element.contentDocument.getElementById(
          `${currentSlide}`
        );

        console.log("BUILDING INTERACTION OBJECT", targetElement);

        if (
          targetElement &&
          !targetElement.querySelector(
            `#DoppioInteractionCanvas_${currentSlide}`
          )
        ) {
          console.log("Element found", targetElement, "using", eventCode);

          let interactionObject = interactionCanvas({
            eventCode: eventCode,
            userId: "sam@doppio.live",
            slideId: currentSlide, // Use the parameter, not the global variable
          });

          if (isFirstSlide) {
            pendingInjections.add(currentSlide); // Mark as pending
            setTimeout(() => {
              // Double-check before injecting
              if (
                !targetElement.querySelector(
                  `#DoppioInteractionCanvas_${currentSlide}`
                )
              ) {
                targetElement.appendChild(interactionObject);
                console.log("Injected canvas into", currentSlide, "(delayed)");
              } else {
                console.log(
                  "Canvas already exists, skipping delayed injection"
                );
              }
              pendingInjections.delete(currentSlide); // Clear pending flag
            }, 5000);
          } else {
            targetElement.appendChild(interactionObject);
            console.log("Injected canvas into", currentSlide, "(immediate)");
          }
        } else {
          console.log("Element is null or undefined");
        }
      })
      .catch((error) => {
        console.error("Failed to inject canvas:", error);
        pendingInjections.delete(currentSlide); // Clear on error
      });
  }

  function checkforURLChange(lastSeenSlide) {
    let r = getCurrentSlideId();
    let currentSlide = r ? r[1] : null;
    if (currentSlide != lastSeenSlide) {
      chrome.runtime.sendMessage({
        type: "CHANGE_CURSOR_EDIT",
        payload: {
          cursor: currentSlide,
          slidesId: getSlidesId(),
          oldSlideId: lastSeenSlide,
        },
      });
      console.log("pinged with", currentSlide);
      console.log("Slide changed, looking for element FCIS", eventCode);
      findCanvasInSlide(currentSlide, false);
    }
    checkPresenting();
    return currentSlide;
  }

  /**
   * Handles slide changes in edit mode (non-presenting)
   * Called by both hashchange event and MutationObserver
   */
  function handleEditModeSlideChange() {
    if (presentingState) return; // Only handle in edit mode

    const slideIdMatch = getCurrentSlideId();
    const slidesId = getSlidesId();

    if (slideIdMatch) {
      const newSlideId = slideIdMatch[1];

      if (newSlideId !== currentSlideId) {
        const oldSlideId = currentSlideId;
        currentSlideId = newSlideId;

        console.log("Edit mode slide change:", newSlideId, "from:", oldSlideId);

        chrome.runtime.sendMessage({
          type: "CHANGE_CURSOR_EDIT",
          payload: {
            cursor: newSlideId,
            slidesId: slidesId,
            oldSlideId: oldSlideId,
          },
        });
        console.log("pinged with", newSlideId, "(edit mode)");
      }
    }
  }

  async function checkPresenting() {
    const element = findElementWithFallback(SELECTORS.FULLSCREEN_OVERLAY);
    const isPresenting = !!element;
    if (presentingState !== isPresenting) {
      presentingState = isPresenting;
      const currentSlideId = getCurrentSlideId();
      const slidesId = getSlidesId();
      if (presentingState) {
        console.log("CHECKING PRESENTING STATE");
        if (currentSlideId && slidesId) {
          console.log(
            "FCIS User STARTED presenting",
            currentSlideId,
            eventCode
          );

          eventCode = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
              {
                type: "START_STOP_PRESENTING",
                payload: {
                  currentSlide: currentSlideId[1],
                  mediaId: slidesId,
                  command: "startpresentation",
                },
              },
              function (response) {
                if (response && response.message && response.message.meta) {
                  console.log("HERE IS RESPONSE", response.message.meta);
                  resolve(response.message.meta.eventCode);
                } else {
                  console.error("Failed to get eventCode");
                  console.log("HERE IS RESPONSE", response);
                  reject("Failed to get eventCode");
                }
              }
            );
          });

          findCanvasInSlide(currentSlideId[1], true);

          let returnedSlide = "";
          intervalId = setInterval(() => {
            returnedSlide = checkforURLChange(returnedSlide);
          }, 100);
        }
      } else {
        if (currentSlideId && slidesId) {
          console.log("User STOPPED presenting");
          clearObserverInterval(intervalId);
          chrome.runtime.sendMessage(
            {
              type: "START_STOP_PRESENTING",
              payload: {
                currentSlide: currentSlideId[1],
                mediaId: slidesId,
                command: "stoppresentation",
              },
            },
            function (response) {
              console.log("HERE IS RESPONSE2", response);
            }
          );
        }
      }
    }
  }

  const observer = new MutationObserver((mutationsList) => {
    console.log(mutationsList.length, "MUTATIONS");
    for (const mutation of mutationsList) {
      console.log("if next");
      if (mutation.type === "childList") {
        handleEditModeSlideChange();
      }
    }
    checkPresenting();
  });

  console.log("popup/index.ts");

  // Listen for URL hash changes (primary detection method for edit mode)
  window.addEventListener("hashchange", () => {
    console.log("Hash changed detected");
    handleEditModeSlideChange();
  });

  document.addEventListener("fullscreenchange", () => {
    console.log("listening for fullscreenchange");
    if (document.fullscreenElement) {
      console.log("Entered fullscreen mode");
    } else {
      console.log("Exited fullscreen mode");
    }
    checkPresenting();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  checkPresenting();
</script>

<div class="overlay">SUP FROM CONTENT SCRIPT!</div>

<style>
  .overlay {
    position: fixed;
    width: 0px;
    top: 16px;
    left: 16px;
    background-color: white;
    border: 1px solid black;
    padding: 16px;
  }
</style>
