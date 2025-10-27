export function interactionCanvas(params: { eventCode: string, slideId: string, userId: string }) {
    const domain = import.meta.env.VITE_CHART_URL || "http://localhost:8080";
    console.log("🔧 [DEBUG] Environment variable VITE_CHART_URL:", import.meta.env.VITE_CHART_URL);
    console.log("🔧 [DEBUG] Using domain:", domain);
    let eventCode = params.eventCode;
    let slideId = params.slideId;
    let userId = params.userId;
    let url = `${domain}/?interaction=${eventCode}__${slideId}__${userId}`;
    console.log("🔧 [DEBUG] Final iframe URL:", url);
    const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    foreignObject.setAttribute("width", "2015");
    foreignObject.setAttribute("height", "1500");
    foreignObject.setAttribute("transform", "matrix(79.4045,0,0,79.4045,92115,47363.6501)");
    foreignObject.setAttribute("x", "0");
    foreignObject.setAttribute("y", "0");

    const iframe = document.createElement("iframe");
    iframe.setAttribute("id", `DoppioInteractionCanvas_${slideId}`);
    iframe.setAttribute("src", url);
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("style", "width: 100%; height: 100%;");
    foreignObject.appendChild(iframe);
    console.log('returning the new object')
    return foreignObject;
}