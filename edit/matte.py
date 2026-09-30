import subprocess,numpy as np,cv2,mediapipe as mp,sys
F='/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2'
DUR=4.3;W,H=1080,1920
rd=subprocess.Popen([F,'-v','error','-t',str(DUR),'-i','work/src30.mp4','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
wr=subprocess.Popen([F,'-y','-v','error','-f','rawvideo','-pix_fmt','rgba','-s',f'{W}x{H}','-r','30','-i','-','-c:v','png','-pix_fmt','rgba','work/person.mov'],stdin=subprocess.PIPE)
seg=mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=0)
prev=None
while True:
    b=rd.stdout.read(W*H*3)
    if len(b)<W*H*3:break
    im=np.frombuffer(b,np.uint8).reshape(H,W,3)
    m=seg.process(cv2.resize(im,(540,960))).segmentation_mask
    m=cv2.resize(m,(W,H),interpolation=cv2.INTER_CUBIC)
    m=np.clip((m-0.72)/0.14,0,1)
    m=cv2.erode(m,np.ones((13,13),np.uint8))
    m=cv2.GaussianBlur(m,(0,0),2.2)
    pass
    prev=m
    rgba=np.dstack([im,(m*255).astype(np.uint8)]);wr.stdin.write(rgba.tobytes())
wr.stdin.close();wr.wait()
