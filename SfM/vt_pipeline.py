from .Py360Convert.convert360 import convert_e_2_c, convert_separated_6c_2_c, convert_c_2_e
import os 
import argparse
import numpy as np
from PIL import Image
from .HLoc_CamPose import recon
from .vt_camera_pose import extract_cam_pose
from .vt_json import make_json
import re


def run_vt(project_id, date, floor):
    '''
    ## Requirement ## 
    <Hierarchical-Localization>
    -> https://github.com/cvg/Hierarchical-Localization

    <py360converter>
    -> zip file 

    <virtual tour>
    -> https://github.com/digicademy/virtualTour
    '''


    '''
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    1. Convert 1 equirectangular image to 6 perspective images (overlapped)
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    '''
    print("\n1. Convert 1 equirectangular image to 6 perspective images (overlapped)")
    #########################################
    # Setting
    pano_imgs_path = f"media/projects/{project_id}/origin/{date}/{floor}/"
    pers_imgs_path = f"media/projects/{project_id}/mapping/{date}/{floor}/"  # perspective image 저장될 경로
    output_path = f"media/projects/{project_id}/sfm/{date}/{floor}/"
    if not os.path.isdir(pers_imgs_path):
        os.makedirs(pers_imgs_path)
    if not os.path.isdir(output_path):
        os.makedirs(output_path)
        
    # PROJECT_NAME = "test1"   # @@@@@ Project name @@@@@  
    # root_name = "./virtualTour/"
    # resource = "resources/"
    # input_path = root_name + resource + PROJECT_NAME + "/"
    # in_path = input_path + "panos/"
    # input_imgs = input_path + "mapping/"  # output folder
    w = 2880
    h = 1440
    #########################################
    # if not os.path.isdir(input_imgs):
    #     os.makedirs(input_imgs)
        
    # load image list
    pano_imgs_list = os.listdir(pano_imgs_path) # load all images in folders
    # img_list_jpg = [img for img in img_list if img.endswith(".jpg")] 
    print(os.getcwd())
    print (f"img_list: {pano_imgs_list}")

    face_k=['F', 'R', 'B', 'L', 'U', 'D']
    image_num = 0
    for i in pano_imgs_list:
        img = np.array(Image.open(pano_imgs_path + i))
        if len(img.shape) == 2:
            img = img[..., None]
        out_filename = i.split(".")[0]
        separated_cubemap, dict_separated_cubemap = convert_e_2_c(img, w, pers_imgs_path, out_filename, overlap=1.5, mode= "bilinear", cube_format = "dice_overlap")
        print()


    '''
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    2. Extract camera pose by SfM 
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    '''
    print("\n2. Extract camera pose by SfM")

    #########################################
    # Setting
    #########################################
    if not os.path.isdir(output_path):
        os.makedirs(output_path)

    # Remove file including "_U" or "_D" 
    for filename in os.listdir(pers_imgs_path):
        file_path = os.path.join(pers_imgs_path, filename)
        # if '_F' not in filename:
        #     os.remove(file_path)
        #     print(f"Deleted: {file_path}")
        if '_U' in filename or '_D' in filename:
            os.remove(file_path)
            print(f"Deleted: {file_path}")
            
    model = recon(pers_imgs_path, output_path, retrieval_type='netvlad', feature_type='superpoint_inloc', match_type='superglue')


    '''
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    3. Make setting json file for virtual tour
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    '''
    print("\n3. Make setting json file for virtual tour")

    #########################################
    # Setting 
    map_path = f"media/projects/{project_id}/map/{floor}.png"
    out_path = output_path + "/sample.json"
    #########################################

    for root, dirs, files in os.walk(output_path):
        for dir_name in dirs:
            if "sfm" in dir_name:
                sfm_input_path = output_path + "/"+ dir_name
                print(sfm_input_path)
                break 
        break
    
    cam_positions, cam_info, images_path, img_pairs = extract_cam_pose(sfm_input_path, output_path)

    imgs_path =  [input_imgs + img_path for img_path in images_path]
    make_json(map_path, cam_info, img_pairs, pano_path= resource + PROJECT_NAME + "/panos/", imgs_path=imgs_path, output_path=out_path)
    
    return cam_info, img_pairs
    
if __name__ == "main":
    main()