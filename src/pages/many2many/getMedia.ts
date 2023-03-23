
function handleError(error: Error) {
    alert("摄像头无法正常使用，请检查是否占用或缺失");
    console.error(
        "navigator.MediaDevices.getUserMedia error: ",
        error.message,
        error.name
    );
}
/**
 * 获取设备 stream
 * @returns {Promise<MediaStream>}
 */
export const getLocalUserMedia = async (opt:any) => {
    const audioId = opt.audioInId
    const videoId = opt.videoId
    let width = opt.rao.split('X')[0] 
    let height = opt.rao.split('X')[1] 
    console.log(width,height)
    const constraints = {
        audio:audioId?{deviceId: {exact: audioId}}:false,
        video: {
            deviceId: videoId ? {exact: videoId} : undefined,
            width:width,
            height:height,
            frameRate: { ideal: 20, max: 24 }
        }
    };
    if (window.stream) {
        window.stream.getTracks().forEach((track:any) => {
            track.stop();
        });
    }
    return await navigator.mediaDevices.getUserMedia(constraints).catch(handleError)
}