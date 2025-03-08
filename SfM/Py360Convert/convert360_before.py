#!/usr/bin/env python
import os
import argparse
import numpy as np
from PIL import Image

import py360convert


# Parsing command line arguments
parser = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter,
                                 description='Convertion between cubemap and equirectangular or equirectangular to perspective.')

# parser.add_argument('--convert', choices=['c2e', 'e2c', 'e2p'], required=True,
#                     help='What convertion to apply.')
# parser.add_argument('--i', required=True,
#                     help='Path to input image.')
# parser.add_argument('--o', required=True,
#                     help='Path to output image.')
# parser.add_argument('--w', required=True, type=int,
#                     help='Output width for c2e or e2p. Output cube faces width for e2c.')
parser.add_argument('--convert', default='e2c',
                    help='What convertion to apply.')
parser.add_argument('--i', default="Py360Convert/images/raw/",
                    help='Path to input image.')
parser.add_argument('--o', default="Py360Convert/images/output/",
                    help='Path to output image.')
parser.add_argument('--w', default="2880", type=int,
                    help='Output width for c2e or e2p. Output cube faces width for e2c.')

parser.add_argument('--h', type=int,
                    help='Output height for c2e or e2p.')
parser.add_argument('--mode', default='bilinear', choices=['bilinear', 'nearest'],
                    help='Resampling method.')
parser.add_argument('--h_fov', type=float, default=60,
                    help='Horizontal field of view for e2p.')
parser.add_argument('--v_fov', type=float, default=60,
                    help='Vertical field of view for e2p.')
parser.add_argument('--u_deg', type=float, default=0,
                    help='Horizontal viewing angle for e2p.')
parser.add_argument('--v_deg', type=float, default=0,
                    help='Vertical viewing angle for e2p.')
parser.add_argument('--in_rot_deg', type=float, default=0,
                    help='Inplane rotation for e2p.')
args = parser.parse_args()


#########################################
# Setting for debugging 
args.convert = "c2e_overlap"
args.i = "Py360Convert/images/raw/cubemap/"
args.o = "Py360Convert/images/output/"
args.w = 2880
args.h = 1440

#########################################


# load image list
image_path = args.i
print(os.getcwd())
img_list = os.listdir(image_path) # load all images in folders
# img_list_jpg = [img for img in img_list if img.endswith(".jpg")] 
print ("img_list: {}".format(img_list))

face_k=['F', 'R', 'B', 'L', 'U', 'D']
img_list_np = []
image_num = 0

'''6 image of cubemap -> 1 image cube map'''
######################################################################
overlap = 1.5
img = np.array(Image.open(image_path + img_list[0]))
cube_h = img
w = cube_h.shape[0]
cube_dice = np.zeros((w * 3, int(w * 4 * overlap), cube_h.shape[2]), dtype=cube_h.dtype)
cube_list = np.split(cube_h, 6, axis=1)
print(cube_h.shape)
print("cube_list:", len(cube_list),len(cube_list[0]),len(cube_list[0][0]))
face_idx = {"F":0, "R":1, "B":2, "L":3, "U":4, "D":5}
# Order: F R B L U D
sxy = [(1, 1), (2, 1), (3, 1), (0, 1), (1, 0), (1, 2)]
separated_cube = []
for i in img_list:
    img_face = i.split(".")[0][-1]
    face = np.array(Image.open(image_path + i))
    (sx, sy) = sxy[face_idx[img_face]]
    cube_dice[sy*w:(sy+1)*w, sx*int(w*overlap):(sx+1)*int(w*overlap)] = face
        
# Output image
Image.fromarray(cube_dice.astype(np.uint8)).save(args.o + i.split(".")[0][:-2] + "_unified.jpg")
print(f"image saved: {args.o}")    
######################################################################

for i in img_list:
    img = np.array(Image.open(image_path + i))

    if len(img.shape) == 2:
        img = img[..., None]

    # Convert
    if args.convert == 'c2e':
        out = py360convert.c2e(img, h=args.h, w=args.w, mode=args.mode)
    elif args.convert == 'c2e_overlap':
        out = py360convert.c2e(img, h=args.h, w=args.w, mode=args.mode, cube_format = "dice_overlap")
    elif args.convert == 'e2c':
        out = py360convert.e2c(img, face_w=args.w, mode=args.mode)
    elif args.convert == 'e2c_overlap':
        out, separated_cubemap = py360convert.e2c(img, face_w=args.w, mode=args.mode, cube_format = "dice_overlap")
        # Save output image
        num = 0
        for face in separated_cubemap:
            print(i.split(".")[0])
            print(args.o + i.split(".")[0] +"_" + face_k[num] + ".jpg")
            Image.fromarray(face).save(args.o + i.split(".")[0] +"_" + face_k[num] + ".jpg")
            num +=1
        image_num += 1
        print(f"{image_num} image complete")    
    elif args.convert == 'e2p':
        out = py360convert.e2p(img, fov_deg=(args.h_fov, args.v_fov), u_deg=args.u_deg, v_deg=args.v_deg,
                            out_hw=(args.h, args.w), in_rot_deg=args.in_rot_deg, mode=args.mode)
    else:
        raise NotImplementedError('Unknown convertion')

    # Output image
    Image.fromarray(out.astype(np.uint8)).save(args.o + i)
    print(f"image saved: {args.o + i}")    
