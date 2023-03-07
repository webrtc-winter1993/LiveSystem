import { useDeviceStore } from "@/store/useDeviceStore";
const deviceStore = useDeviceStore();

function handleError(error: Error) {
    alert("摄像头无法正常使用，请检查是否占用或缺失");
    console.error(
        "navigator.MediaDevices.getUserMedia error: ",
        error.message,
        error.name
    );
}

/**
 * @author han
 * device list init
 */
export function getLocalDevice(constraints = { video: true, audio: false }) {
    var localDevice: any = {
        audioIn: [],
        videoIn: [],
        audioOut: [],
    };

    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        alert("浏览器不支持获取媒体设备");
        console.log("浏览器不支持获取媒体设备");
        return;
    }

    navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function (stream) {
            stream.getTracks().forEach((trick) => {
                //清除当前标签页中没有销毁的媒体流
                trick.stop();
            });

            // List cameras and microphones.获取摄像头麦克风等设备
            navigator.mediaDevices
                .enumerateDevices()
                .then(function (devices) {
                    devices.forEach(function (device) {
                        let obj = {
                            id: device.deviceId,
                            kind: device.kind,
                            label: device.label,
                        };
                        if (device.kind === "audioinput") {
                            if (
                                localDevice.audioIn.filter((e: any) => e.id === device.deviceId)
                                    .length === 0
                            ) {
                                localDevice.audioIn.push(obj);
                            }
                        }
                        if (device.kind === "audiooutput") {
                            if (
                                localDevice.audioOut.filter(
                                    (e: any) => e.id === device.deviceId
                                ).length === 0
                            ) {
                                localDevice.audioOut.push(obj);
                            }
                        } else if (device.kind === "videoinput") {
                            if (
                                localDevice.videoIn.filter((e: any) => e.id === device.deviceId)
                                    .length === 0
                            ) {
                                localDevice.videoIn.push(obj);
                            }
                        }
                    });
                    console.log('本地设备',localDevice)
                    deviceStore.updated(localDevice);
                })
                .catch(handleError);
        })
        .catch(handleError);
}
/**
 * 获取设备媒体流 stream
 * @param constraints
 * @returns {Promise<MediaStream>}
 */
const getLocalUserMedia = async (constraints: any) => {
    return await navigator.mediaDevices.getUserMedia(constraints);
};
/**
 * 获取指定媒体设备id对应的媒体流
 * @author han
 * @param videoId
 * @param audioId
 * @param formInline
 * @returns {Promise<void>}
 */
export const getTargetDeviceMedia = async (
    videoId: any,
    audioId: any,
    formInline: any
) => {
    const constraints = {
        audio: audioId
            ? { deviceId: audioId ? { exact: audioId } : undefined }
            : false,
        video: {
            deviceId: videoId ? { exact: videoId } : undefined,
            width: formInline.width,
            height: formInline.height,
            frameRate: { ideal: formInline.frameRate, max: 24 },
        },
    };
    if (window.stream) {
        window.stream.getTracks().forEach((track: any) => {
            track.stop();
        });
    }
    return await getLocalUserMedia(constraints).catch(handleError);
};

/**
 * 获取屏幕分享的媒体流
 * @author suke
 * @returns {Promise<void>}
 */
export const getShareMedia = async () => {
    const constraints = {
        video: { width: 1920, height: 1080 },
        audio: false,
    };
    if (window.stream) {
        window.stream.getTracks().forEach((track: any) => {
            track.stop();
        });
    }
    return await navigator.mediaDevices
        .getDisplayMedia(constraints)
        .catch(handleError);
};
