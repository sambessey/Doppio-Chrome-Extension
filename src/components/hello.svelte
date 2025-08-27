<script>
  import { interactionCanvas } from "../content/interaction-helpers"; 
  let currentSlideId = window.location.href.split("slide=id.")[1];
  let hasGraph = false;
  let presentingState = false;
  let intervalId = 0;
  let interactiveDOM;
  let eventCode = "0";

  function getCurrentSlideId() {
    console.log('GETTING SLIDE ID')
    const hash = window.location.hash;
    const slideIdMatch = hash.match(/#slide=id\.(.+)/);
    return slideIdMatch;
  }

  function getSlidesId(){
    return window.location.pathname.split("/")[3]
  } 

  function clearObserverInterval(i) {
    console.log('CLEARING INTERVAL',i);
    clearInterval(i);
  }

  function waitForElement(selector, timeout = 6000) {
        return new Promise((resolve, reject) => {
            const interval = 2000; // Check every 100ms
            let elapsedTime = 0;

            const checkElement = () => {
                interactiveDOM = document.getElementsByClassName(selector)[0];
                if (interactiveDOM && interactiveDOM.contentDocument.body?.firstChild) {
                    resolve(interactiveDOM);
                } else if (elapsedTime >= timeout) {
                    reject(new Error('Element not found within timeout'));
                } else {
                    elapsedTime += interval;
                    setTimeout(checkElement, interval);
                }
            };

            checkElement();
        });
    }

  function findCanvasInSlide(currentSlide,isFirstSlide){
    waitForElement("punch-present-iframe")
        .then(element =>  {
   //   const firstQuerySelector = interactiveDOM.contentDocument.querySelector("body > div:nth-child(12) > div.punch-viewer-container > div > div > div > div:nth-child(2) > div.punch-viewer-svgpage-svgcontainer");
  //    if (firstQuerySelector) console.log('FIRST QS!');
   //   const secondQuerySelector = interactiveDOM.contentDocument.querySelector("body > div:nth-child(12) > div.punch-viewer-container > div > div > div > div > div.punch-viewer-svgpage-svgcontainer");
  //    if (secondQuerySelector && !secondQuerySelector.querySelector("#DoppioInteractionCanvas")){
  //      if (secondQuerySelector) console.log('SECOND QS!');
  //      const element = secondQuerySelector.querySelector(`#${currentSlideId}-bg`)?.firstChild?.firstChild;
  //const targetElement = currentSlide ? currentSlide : element.contentDocument.getElementById(`${currentSlideId}`);
 //const targetElement = element.contentDocument.getElementById(`${currentSlide}`);

  let targetElement = element.contentDocument.getElementById(`${currentSlide}`);
 // let debugElement = element.contentDocument.querySelector("body > div:nth-child(13) > div.sketchyViewerContainer > div > div > div > div > div.punch-viewer-svgpage-svgcontainer > svg")
   let debugElement = element.contentDocument.querySelector("body > div:nth-child(13) > div.sketchyViewerContainer > div > div > div > div")
  const children = targetElement ? targetElement.children : null;
  const secondChild = children ? children[1] : null;
  console.log('BUILDING INTERACTION OBJECT',targetElement,children,secondChild);
  if (targetElement && !targetElement.querySelector("#DoppioInteractionCanvas")){
    const element = targetElement
        if (element) {
          console.log('Element found',element,'using',eventCode);
          let interactionObject = interactionCanvas({
            eventCode: eventCode,
            userId: "sam@doppio.live",
            slideId: currentSlideId,
          });
          if (isFirstSlide) {
            setTimeout(() => {
                element.appendChild(interactionObject);
            }, 5000);
        } else {
            element.appendChild(interactionObject);
        }
     //     }
        } else {
          console.log('Element is null or undefined');
        }
      }
    } )
        .catch(error => {
            console.error(error);
        });
  }
  

  function checkforURLChange(lastSeenSlide){
    let r = getCurrentSlideId();
    let currentSlide = r ? r[1] : null;
      if(currentSlide != lastSeenSlide){
        chrome.runtime.sendMessage({
              type: 'CHANGE_CURSOR_EDIT',
              payload: {
                cursor: currentSlide,
                slidesId: getSlidesId(),
                oldSlideId: lastSeenSlide
              }
            });
            console.log('pinged with', currentSlide);
            console.log('Slide changed, looking for element FCIS',eventCode)
            findCanvasInSlide(currentSlide,false)
      }
      checkPresenting()
    return currentSlide;
  }

  async function checkPresenting() {
  const element = document.getElementsByClassName('punch-full-screen-element punch-full-window-overlay')[0];
  const isPresenting = !!element;  
  if (presentingState !== isPresenting) {
    presentingState = isPresenting;
    const currentSlideId = getCurrentSlideId();
    const slidesId = getSlidesId();
    if (presentingState) {
      console.log('CHECKING PRESENTING STATE');
      if (currentSlideId && slidesId) {
        console.log('FCIS User STARTED presenting', currentSlideId, eventCode);
        findCanvasInSlide(currentSlideId[1], true);
        let returnedSlide = "";
        intervalId = setInterval(() => {
          returnedSlide = checkforURLChange(returnedSlide);
        }, 100);

        // Wait for eventCode to be populated
        eventCode = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            {
              type: 'START_STOP_PRESENTING',
              payload: {
                currentSlide: currentSlideId[1],
                mediaId: slidesId,
                command: 'startpresentation'
              }
            },
            function (response) {
              if (response && response.message && response.message.meta) {
                console.log('HERE IS RESPONSE', response.message.meta);
                resolve(response.message.meta.eventCode);
              } else {
                console.error('Failed to get eventCode');
                reject('Failed to get eventCode');
              }
            }
          );
        });
      }
    } else {
      if (currentSlideId && slidesId) {
        console.log('User STOPPED presenting');
        clearObserverInterval(intervalId);
        // observer.disconnect();
        chrome.runtime.sendMessage(
          {
            type: 'START_STOP_PRESENTING',
            payload: {
              currentSlide: currentSlideId[1],
              mediaId: slidesId,
              command: 'stoppresentation'
            }
          },
          function (response) {
            console.log('HERE IS RESPONSE2', response);
          }
        );
      }
    }
  }
}

  const observer = new MutationObserver((mutationsList) => {
    console.log(mutationsList.length,'MUTATIONS')
    for (const mutation of mutationsList) {
      console.log('if next')
      if (mutation.type === 'childList') {
        // Check the current URL or slide ID
        //const hash = window.location.hash;
        const slideIdMatch = getCurrentSlideId();
        const slidesId = getSlidesId();
        let oldSlideId = null;
        if (slideIdMatch) {
          const newSlideId = slideIdMatch[1];
          console.log('SLIDE ID MATCH',slideIdMatch,newSlideId)

          if (newSlideId !== currentSlideId) {
            oldSlideId = currentSlideId;
            currentSlideId = newSlideId;
            if (!presentingState){
            console.log("MUTATION OBSERVER", newSlideId, slidesId, oldSlideId);
            chrome.runtime.sendMessage({
              type: 'CHANGE_CURSOR_EDIT',
              payload: {
                cursor: newSlideId,
                slidesId: slidesId,
                oldSlideId: oldSlideId
              }
            });
            console.log('pinged with', newSlideId);
          }
          }
        }
      }
    }
    // Check if the user is presenting
    checkPresenting();
  });

  console.log('popup/index.ts');
  document.addEventListener('fullscreenchange', () => {
    console.log('listening for fullscreenchange');
    if (document.fullscreenElement) {
      console.log('Entered fullscreen mode');
    } else {
      console.log('Exited fullscreen mode');
    }
    // Check if the user is presenting
    checkPresenting();
  });

  // Start observing the document with the configured parameters
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial check for presenting mode
  checkPresenting();
</script>

<div class="overlay">
  SUP FROM CONTENT SCRIPT!
</div>

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