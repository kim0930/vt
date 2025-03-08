#!/usr/bin/env python
import os
import argparse
import numpy as np
from PIL import Image
from .py360convert import *

face_k=['F', 'R', 'B', 'L', 'U', 'D']

def convert_e_2_c(img, w, out_path, out_filename, overlap=1.0, mode= "bilinear", cube_format = "dice_overlap"):
    out, separated_cubemap = e2c(img, face_w=w, mode=mode, cube_format = "dice_overlap", overlap=1.0)
    # Save output image
    dict_separated_cubemap = {}
    num = 0
    for face in separated_cubemap:
        Image.fromarray(face).save(out_path + out_filename +"_" + face_k[num] + ".jpg")
        dict_separated_cubemap[face_k[num]] = face
        print(f"e2c: image convert complete -> {out_path + out_filename}_{face_k[num]}.jpg")    
        num +=1
    return separated_cubemap, dict_separated_cubemap


def convert_separated_6c_2_c(separated_cubemap, out_path, out_filename, overlap=1.5):  
    '''6 image of cubemap -> 1 image cube map'''
    # img_list = os.listdir(image_path) # load all images in folders
    # img = np.array(Image.open(image_path + img_list[0]))

    ######################################################################
    # overlap = 1.5
    cube_h = separated_cubemap[0]
    w = cube_h.shape[0]
    cube_dice = np.zeros((w * 3, int(w * 4 * overlap), cube_h.shape[2]), dtype=cube_h.dtype)
    # cube_list = np.split(cube_h, 6, axis=1)
    cube_list = separated_cubemap
    print(cube_h.shape)
    print("cube_list:", len(cube_list),len(cube_list[0]),len(cube_list[0][0]))
    face_idx = {"F":0, "R":1, "B":2, "L":3, "U":4, "D":5}
    # Order: F R B L U D
    sxy = [(1, 1), (2, 1), (3, 1), (0, 1), (1, 0), (1, 2)]
    num = 0
    for face in separated_cubemap:
        # img_face = i.split(".")[0][-1]
        # face = np.array(Image.open(image_path + i))
        (sx, sy) = sxy[face_idx[face_k[num]]]
        cube_dice[sy*w:(sy+1)*w, sx*int(w*overlap):(sx+1)*int(w*overlap)] = face
        num+=1
    # Output image
    Image.fromarray(cube_dice.astype(np.uint8)).save(out_path + out_filename + "_unified.jpg")
    print(f"6c2c: image convert complete -> {out_path + out_filename}_unified.jpg")
    ######################################################################
    return cube_dice

def convert_c_2_e(cube_dice, h, w, out_path, out_filename, mode="bilinear", cube_format= "dice_overlap"):
    out = c2e(cube_dice, h=h, w=w, mode=mode, cube_format = cube_format)
    
    # Output image
    Image.fromarray(out.astype(np.uint8)).save(out_path + out_filename + "_converted.jpg")
    print(f"6c2c: image convert complete -> {out_path + out_filename}_converted.jpg")
    return out


if __name__ == "__main__":
    
    #########################################
    # Setting for debugging 
    in_path = "Py360Convert//input/"
    out_path = "Py360Convert/output/"
    w = 2880
    h = 1440
    #########################################

    # load image list
    image_path = in_path
    print(os.getcwd())
    img_list = os.listdir(image_path) # load all images in folders
    # img_list_jpg = [img for img in img_list if img.endswith(".jpg")] 
    print ("img_list: {}".format(img_list))

    face_k=['F', 'R', 'B', 'L', 'U', 'D']
    img_list_np = []
    image_num = 0

    for i in img_list:
        img = np.array(Image.open(image_path + i))

        if len(img.shape) == 2:
            img = img[..., None]
        out_path = out_path
        out_filename = i.split(".")[0]
        separated_cubemap, _ = convert_e_2_c(img, w, out_path, out_filename, overlap=1.5, mode= "bilinear", cube_format = "dice_overlap")
        
        '''
        here for depth estimation 
        '''
        
        cube_dice = convert_separated_6c_2_c(separated_cubemap, out_path, out_filename, overlap=1.5)
        out = convert_c_2_e(cube_dice, h, w, out_path, out_filename, mode="bilinear", cube_format= "dice_overlap")