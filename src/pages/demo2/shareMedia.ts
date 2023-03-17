export function handleError(error: Error) {
    alert("摄像头无法正常使用，请检查是否占用或缺失");
    console.error(
        "navigator.MediaDevices.getUserMedia error: ",
        error.message,
        error.name
    );
}
export function getParams(queryName: any) {
    let url = window.location.href;
    let query = decodeURI(url.split("?")[1]);
    let vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split("=");
      if (pair[0] === queryName) {
        return pair[1];
      }
    }
    return null;
  }
/**
 * 获取屏幕分享的媒体流
 * @author suke
 * @returns {Promise<void>}
 */
 export async function getShareMedia(){
    const constraints = {
        video:{width:500,height:400},
        audio:true
    };
    if (window.stream) {
        window.stream.getTracks().forEach((track:any) => {
            track.stop();
        });
        window.stream.getAudioTracks().forEach((e: any) => {
            window.stream.removeTrack(e);
          });
    }
    return await navigator.mediaDevices.getDisplayMedia(constraints).catch(handleError);
}