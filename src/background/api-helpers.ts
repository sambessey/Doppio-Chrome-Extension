export async function restUpdateCursor({
  url,
  uid,
  eventId,
  prevSlide,
  nextSlide
}: {
  url: string,
  uid: string,
  eventId: string,
  prevSlide: string,
  nextSlide: string
}) {
  const data = {
    uid,
    eventId,
    prevSlide,
    nextSlide
  };
  console.log('PASSING DATA', data);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error posting data:', error);
    throw error;
  }
}

export async function restStartStopPresentation({
  url,
  uid,
  currentSlide,
  mediaId
}: {
  url: string,
  uid: string,
  currentSlide: string,
  mediaId: string
}) {
  const data = {
    uid,
    currentSlide,
    mediaId
  };
  console.log('PASSING DATA', data);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error posting data:', error);
    throw error;
  }
}

export async function restRefreshEventId({
  url,
  uid,
  mediaId
}: {
  url: string,
  uid: string,
  mediaId: string | undefined //Promise<string>
}) {
  const data = {
    uid,
    mediaId
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    console.log('result', result);  
    return result;
  } catch (error) {
    console.error('Error posting data:', error);
    throw error;
  }
}