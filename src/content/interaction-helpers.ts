export function interactionCanvas(params: { eventCode: string, slideId: string, userId: string }) {
    let domain = "https://goldfish-app-fc9hk.ondigitalocean.app"
    let eventCode = params.eventCode;
    let slideId = params.slideId;
    let userId = params.userId;
    let url = `${domain}/?interaction=${eventCode}__${slideId}__${userId}`;
    const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    foreignObject.setAttribute("width", "2015");
    foreignObject.setAttribute("height", "1500");
    foreignObject.setAttribute("transform", "matrix(79.4045,0,0,79.4045,92115,47363.6501)");
    foreignObject.setAttribute("x", "0");
    foreignObject.setAttribute("y", "0");

    const iframe = document.createElement("iframe");
    iframe.setAttribute("id", "DoppioInteractionCanvas");
    iframe.setAttribute("src", url);
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("style", "width: 100%; height: 100%;");
    foreignObject.appendChild(iframe);
    console.log('returning the new object')
    return foreignObject;
}