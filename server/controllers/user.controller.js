import {catchAsyncError} from "../middleware/catchAsyncError.middleware.js";
import {User} from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateJWTToken } from "../utils/jwtToken.js";
import { v2 as cloudinary} from "cloudinary";

export const signup = catchAsyncError(async(req,res,next)=>{
    const {fullname,email,password} = req.body;
    if(!fullname || !email || !password){
        return res.status(400).json({
            success:false,
            message: "pls provide required field"
        })
    }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if(!emailRegex.test(email)){
        return res.status(400).json({
            success:false,
            message: "invaild email"
        })
    }
    if(password.length<8){
        return res.status(400).json({
            success:false,
            message: "password must be at least 8 char"
        })
    }
    const isEmailAlreadyPresent = await User.findOne({email});
    if(isEmailAlreadyPresent){
        return res.status(400).json({
            success:false,
            message: "email already in use"
        })
    }

    const hashedPassword = await bcrypt.hash(password,10);
    const user = await User.create({
        fullname,
        email ,
        password : hashedPassword,
        avatar:{
            public_id:"",
            url:"",
        }
    })

    generateJWTToken(user,"User Registered Successfully",201,res);


});
export const signin = catchAsyncError(async(req,res,next)=>{
    const {email,password} = req.body;
    if(!email || !password){ 
            return res.status(400).json({
            success:false,
            message: "send full credential"
        })}

    const emailRegex = /^\S+@\S+\.\S+$/;
    if(!emailRegex.test(email)){
        return res.status(400).json({
            success:false,
            message: "invaild email"
        })
    }
    const user = await User.findOne({email});
    if(!user){
         return res.status(400).json({
            success:false,
            message: "pahle Register karo dost"
        })
    }

    const isPasswordMatched = await bcrypt.compare(password,user.password)
    if(!isPasswordMatched){
         return res.status(400).json({
            success:false,
            message: "password galat hai bhai"
        })
    }
     generateJWTToken(user,"User Registered Successfully",200,res);
    


});

export const signout = catchAsyncError(async(req,res,next)=>{
    res.status(200).cookie("token", "",{
        httpOnly : true,
        maxAge : 0,
        sameSite: "strict",
        secure: process.env.NODE_ENV !== "development" ? true:false,
    }).json({
        success:true,
        message:"user logged out",
        
    });
});
export const getUser = catchAsyncError(async(req,res,next)=>{
    const user = req.user;
    res.status(200).json({
        success:true,
        user
    })
});

export const updateProfile = catchAsyncError(async(req,res,next)=>{
    const { fullname, email } = req.body;
    if(fullname.length === 0 || email.length ===0){
        return res.status(400).json({
             success : false,
        message : "please provide complete details"
        });  
    }

    const avatar  = req?.files?.avatar;
    let cloudinaryResponse = {};

    if(avatar){
        try{
            const oldAvatarPublicId = req.user?.avatar?.public_id;
            if(oldAvatarPublicId && oldAvatarPublicId.length>0){
                await cloudinary.uploader.destroy(oldAvatarPublicId);
            }
            cloudinaryResponse = await cloudinary.uploader.upload(
                avatar.tempFilePath,
                {
                    folder : "CHAT_APP_USERS_AVATARS",
                    transformation : [
                        {width :300,height:300, crop : "limit"},
                        {quality :"auto"},
                        {fetch_format : "auto"}
                    ]
                }
            )
        }
        catch(error){
            console.error("cloudinary upload error: ", error);
            return res.status(500).json({
                success:false,
                message: "failed to upload avatar. please try again later.",
            })
        }
    }
    let data = {
        fullname,
        email
    };
    if(avatar && cloudinaryResponse?.public_id && cloudinaryResponse?.secure_url){
        data.avatar = {
            public_id: cloudinaryResponse.public_id,
            url : cloudinaryResponse.secure_url
        };
    }

    let user = await User.findByIdAndUpdate(req.user._id,data,{
        new : true,
        runValidators :true
    });
    res.status(200).json({
        success:true,
        message:"profile updated successfully",
        user
    });
});