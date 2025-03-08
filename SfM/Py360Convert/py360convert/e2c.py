import numpy as np

from . import utils_rev as utils


def e2c(e_img, face_w=256, mode='bilinear', cube_format='dice', overlap=1.0):
    '''
    e_img:  ndarray in shape of [H, W, *]
    face_w: int, the length of each face of the cubemap
    '''
    assert len(e_img.shape) == 3
    h, w = e_img.shape[:2]
    if mode == 'bilinear':
        order = 1
    elif mode == 'nearest':
        order = 0
    else:
        raise NotImplementedError('unknown mode')
    
    ################################################
    # Revised here by THKIM
    # if cube_format == "list_overlap" or cube_format == "dice_overlap":
    #     overlap=1.5
    # else: 
    #     overlap=1.0
    xyz = utils.xyzcube(face_w, overlap)      
    ################################################
    #   xyz = utils.xyzcube(face_w)      
    uv = utils.xyz2uv(xyz)
    coor_xy = utils.uv2coor(uv, h, w)

    cubemap = np.stack([
        utils.sample_equirec(e_img[..., i], coor_xy, order=order)
        for i in range(e_img.shape[2])
    ], axis=-1)
    
    separated_cubemap = []
    if cube_format == 'horizon':
        pass
    elif cube_format == 'list':
        cubemap = utils.cube_h2list(cubemap)
    elif cube_format == 'list_overlap':
        cubemap = utils.cube_h2list_overlap(cubemap, overlap)
    elif cube_format == 'dict':
        cubemap = utils.cube_h2dict(cubemap)
    elif cube_format == 'dice':
        cubemap = utils.cube_h2dice(cubemap)
    elif cube_format == 'dice_overlap':
        cubemap, separated_cubemap = utils.cube_h2dice_overlap(cubemap, overlap)
        return cubemap, separated_cubemap

    else:
        raise NotImplementedError()
    
    return cubemap