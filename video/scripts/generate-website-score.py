import math, wave, array
from pathlib import Path
rate=44100
length=33
chord_length=length/4
notes=[(146.832,183.498,220.0,293.665),(110.0,138.591,164.814,220.0),(123.471,146.832,184.997,246.942),(97.999,123.471,146.832,195.998)]
# Original instrumental: soft D-major pad, felt-like arpeggio, restrained pulse.
samples=array.array('h')
for i in range(rate*length):
 t=i/rate
 chord_i=min(int(t/chord_length),3)
 local=t-chord_i*chord_length
 chord=notes[chord_i]
 env=min(1,local/1.2)*min(1,(chord_length-local)/1.4)
 pad=sum(math.sin(2*math.pi*f*t)*.027+math.sin(2*math.pi*(f*1.002)*t)*.019+math.sin(2*math.pi*f*2*t)*.005 for f in chord)*env
 beat=0.75
 phase=t%beat
 note_index=int(t/beat)%8
 pitch=chord[[0,2,1,3,2,1,3,2][note_index]]*2
 arp_env=(1-math.exp(-phase*130))*math.exp(-phase*5.5)
 arp=(math.sin(2*math.pi*pitch*phase)+.21*math.sin(2*math.pi*pitch*2*phase)+.07*math.sin(2*math.pi*pitch*3*phase))*.055*arp_env
 pulse=math.sin(2*math.pi*55*t)*.013*math.exp(-phase*12)
 fade=min(1,t/1.8)*min(1,(length-t)/2.2)
 left=(pad+arp+pulse)*fade
 right=(pad+arp*.82+math.sin(2*math.pi*chord[2]*1.0015*t)*env*.009+pulse)*fade
 samples.extend((int(max(-1,min(1,left))*32767),int(max(-1,min(1,right))*32767)))
with wave.open('video/public/website-tour/score.wav','wb') as out:
 out.setnchannels(2);out.setsampwidth(2);out.setframerate(rate);out.writeframes(samples.tobytes())
